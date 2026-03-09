// ============================================
// SERVIDOR MODBUS SLAVE
// ============================================

import { ModbusReadResponse } from "@/types";
import { systemLogger } from "./system-logger";
import { connectionTracker } from "./connection-tracker";
import { criticalAlerts } from "./critical-alerts";

const net = require("net");
const Modbus = require("jsmodbus");

export class ModbusServer {
  private server: any;
  private netServer: any;
  private port: number;
  private connected: boolean = false;
  private clientsConnected: number = 0;
  private activeSockets: Set<any> = new Set(); // Rastreia sockets ativos

  // Buffers para jsmodbus (usa Buffers, não Maps)
  private coilsBuffer: Buffer;
  private holdingBuffer: Buffer;

  constructor(port: number) {
    this.port = port;

    // Cria buffers para 10000 coils e 10000 registradores
    this.coilsBuffer = Buffer.alloc(10000); // 1 byte por coil
    this.holdingBuffer = Buffer.alloc(10000 * 2); // 2 bytes por register

    // Inicializa tudo em 0
    this.coilsBuffer.fill(0);
    this.holdingBuffer.fill(0);

    systemLogger.debug(
      "Modbus Server",
      `Buffers inicializados: ${this.coilsBuffer.length} coils, ${this.holdingBuffer.length / 2} registers`,
    );
  }

  /**
   * Inicia o servidor Modbus Slave
   */
  start(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.netServer = new net.Server();

        this.netServer.on("connection", (socket: any) => {
          this.clientsConnected++;
          this.activeSockets.add(socket); // Rastreia socket ativo

          const clientIp =
            socket.remoteAddress?.replace("::ffff:", "") || "desconhecido";
          const clientPort = socket.remotePort || 0;

          // Registra conexão no tracker
          const connectionId = connectionTracker.addConnection(socket);

          // Cria servidor Modbus para este socket usando os buffers compartilhados
          const modbusServer = new Modbus.server.TCP(socket, {
            holding: this.holdingBuffer,
            coils: this.coilsBuffer,
          });

          // CRITICAL: jsmodbus precisa que você emita o evento 'connection'!
          // Isso inicializa os handlers internos do jsmodbus
          socket.emit("connection", socket);

          // Log de respostas enviadas (desativado - gera centenas de logs por segundo)
          // Apenas atualiza a atividade da conexão
          const originalWrite = socket.write.bind(socket);
          socket.write = function (data: any, ...args: any[]) {
            if (Buffer.isBuffer(data)) {
              connectionTracker.updateActivity(connectionId);
            }
            return originalWrite(data, ...args);
          };

          socket.on("close", () => {
            this.clientsConnected--;
            this.activeSockets.delete(socket); // Remove socket quando fechar
            connectionTracker.removeConnection(connectionId);
          });

          socket.on("error", (err: Error) => {
            systemLogger.error(
              "Modbus Server",
              `Erro no socket ${clientIp}:${clientPort}: ${err.message}`,
            );
            criticalAlerts.addAlert(
              "server_error",
              "warning",
              `Erro no socket do CLP (${clientIp}:${clientPort}): ${err.message}`,
              { clientIp, clientPort, error: err.message },
            );
          });
        });

        this.netServer.on("error", (err: Error) => {
          systemLogger.error(
            "Modbus Server",
            `Erro no servidor: ${err.message}`,
          );
          criticalAlerts.addAlert(
            "server_error",
            "critical",
            `Erro crítico no servidor Modbus: ${err.message}`,
            { port: this.port, error: err.message },
          );
          systemLogger.error(
            "Modbus Server",
            `Erro no servidor: ${err.message}`,
          );
          reject(err);
        });

        // Escuta em todas as interfaces (0.0.0.0) para aceitar conexões locais e remotas
        systemLogger.info(
          "Modbus Server",
          `Tentando iniciar servidor na porta ${this.port}...`,
        );
        this.netServer.listen(this.port, "0.0.0.0", () => {
          this.connected = true;
          connectionTracker.setServerInfo("0.0.0.0", this.port);
          systemLogger.success(
            "Modbus Server",
            `Servidor Slave rodando na porta ${this.port} (todas as interfaces)`,
          );
          resolve(true);
        });
      } catch (error) {
        this.connected = false;
        reject(error);
      }
    });
  }

  /**
   * Para o servidor
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Fecha todos os sockets ativos primeiro
      this.activeSockets.forEach((socket) => {
        try {
          socket.destroy(); // Força fechamento imediato
        } catch (err) {
          // Ignora erros ao fechar sockets
        }
      });
      this.activeSockets.clear();
      connectionTracker.clearConnections();

      if (this.netServer) {
        // Fecha o servidor e espera liberar a porta
        this.netServer.close(() => {
          systemLogger.info(
            "Modbus Server",
            "Servidor parado e porta liberada",
          );
          this.connected = false;
          this.clientsConnected = 0;
          resolve();
        });

        // Se não fechar em 2s, força resolução
        setTimeout(() => {
          this.connected = false;
          this.clientsConnected = 0;
          resolve();
        }, 2000);
      } else {
        this.connected = false;
        this.clientsConnected = 0;
        resolve();
      }
    });
  }

  /**
   * Verifica se está rodando
   */
  isRunning(): boolean {
    return this.connected;
  }

  /**
   * Verifica se há clientes conectados
   */
  hasClients(): boolean {
    return this.clientsConnected > 0;
  }

  /**
   * Escreve em um coil (para o CLP ler)
   * Modbus usa 1 bit por coil, então 8 coils por byte
   */
  writeCoil(address: number, value: boolean): void {
    const byteIndex = Math.floor(address / 8);
    const bitPosition = address % 8;

    if (byteIndex < 0 || byteIndex >= this.coilsBuffer.length) {
      systemLogger.error(
        "Modbus Server",
        `Endereço de coil inválido: ${address}`,
      );
      return;
    }

    // Lê o valor antigo do bit
    const oldValue = (this.coilsBuffer[byteIndex] & (1 << bitPosition)) !== 0;

    // Seta ou limpa o bit
    if (value) {
      this.coilsBuffer[byteIndex] |= 1 << bitPosition; // Seta o bit
    } else {
      this.coilsBuffer[byteIndex] &= ~(1 << bitPosition); // Limpa o bit
    }

    if (oldValue !== value) {
      systemLogger.info(
        "Modbus Server",
        `Coil ${address} alterado: ${oldValue} → ${value}`,
        { byteIndex, bitPosition },
      );
    }
  }

  /**
   * Escreve em um holding register (para o CLP ler)
   */
  writeRegister(address: number, value: number): void {
    const byteAddress = address * 2;
    if (byteAddress < 0 || byteAddress + 1 >= this.holdingBuffer.length) {
      systemLogger.error(
        "Modbus Server",
        `Endereço de register inválido: ${address}`,
      );
      return;
    }

    const oldValue = this.holdingBuffer.readUInt16BE(byteAddress);
    this.holdingBuffer.writeUInt16BE(value, byteAddress);

    if (oldValue !== value) {
      systemLogger.info(
        "Modbus Server",
        `Register ${address} alterado: ${oldValue} → ${value}`,
      );
    }
  }

  /**
   * Lê um coil
   * Modbus usa 1 bit por coil, então 8 coils por byte
   */
  readCoil(address: number): boolean {
    const byteIndex = Math.floor(address / 8);
    const bitPosition = address % 8;

    if (byteIndex < 0 || byteIndex >= this.coilsBuffer.length) return false;

    return (this.coilsBuffer[byteIndex] & (1 << bitPosition)) !== 0;
  }

  /**
   * Lê um holding register
   */
  readRegister(address: number): number {
    const byteAddress = address * 2;
    if (byteAddress < 0 || byteAddress + 1 >= this.holdingBuffer.length)
      return 0;
    return this.holdingBuffer.readUInt16BE(byteAddress);
  }

  /**
   * Escreve múltiplos coils
   */
  writeMultipleCoils(startAddress: number, values: boolean[]): void {
    values.forEach((value, index) => {
      this.writeCoil(startAddress + index, value);
    });
  }

  /**
   * Escreve múltiplos registers
   */
  writeMultipleRegisters(startAddress: number, values: number[]): void {
    values.forEach((value, index) => {
      this.writeRegister(startAddress + index, value);
    });
  }

  /**
   * Configura tempos de motor ativo nos holding registers
   * Registers 0-5: Tempo de motor ativo para cada saída (1-6)
   * CLP lê esses valores para saber quanto tempo manter motor ativo
   */
  setEngineActiveDurations(durations: number[]): void {
    durations.forEach((duration, index) => {
      this.writeRegister(index, duration); // Register 0 = Saída 1, Register 1 = Saída 2, etc
    });
    systemLogger.info(
      "Modbus Server",
      `Tempos de motor ativo configurados: ${durations.join(", ")} ms`,
    );
  }
}
