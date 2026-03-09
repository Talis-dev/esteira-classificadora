// ============================================
// CLIENTE MODBUS TCP
// ============================================

import { ModbusReadResponse, ModbusWriteCommand } from "@/types";
import { criticalAlerts } from "./critical-alerts";
import { systemLogger } from "./system-logger";

const net = require("net");
const Modbus = require("jsmodbus");

export class ModbusClient {
  private client: any;
  private socket: any;
  private host: string;
  private port: number;
  private timeout: number;
  private connected: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private shouldAutoReconnect: boolean = true; // Flag para controlar auto-reconexão
  private lastErrorLogged: boolean = false; // Flag para evitar spam de logs
  private wasConnected: boolean = false; // Flag para detectar reconexão bem-sucedida
  private connectionStableTime: number = 0; // Timestamp de quando a conexão se estabilizou
  private reconnectAttempts: number = 0; // Número de tentativas de reconexão

  constructor(host: string, port: number, timeout: number = 5000) {
    this.host = host;
    this.port = port;
    this.timeout = timeout;
  }

  /**
   * Conecta ao servidor Modbus TCP
   */
  async connect(): Promise<boolean> {
    // Reabilitar auto-reconexão ao conectar explicitamente
    this.shouldAutoReconnect = true;

    return new Promise((resolve, reject) => {
      try {
        this.socket = new net.Socket();
        this.client = new Modbus.client.TCP(this.socket);

        // Configura timeout alto para não derrubar conexão
        this.socket.setTimeout(30000); // 30 segundos

        // Ativa keepalive para manter conexão viva
        this.socket.setKeepAlive(true, 5000); // Envia keepalive a cada 5s
        this.socket.setNoDelay(true); // Desabilita Nagle para respostas rápidas

        this.socket.on("connect", () => {
          this.connected = true;
          this.connectionStableTime = Date.now();
          this.reconnectAttempts = 0;

          // Logar sucesso apenas se estava desconectado ou é primeira conexão
          if (!this.wasConnected || this.lastErrorLogged) {
            systemLogger.success(
              "Modbus Client",
              `Conectado a ${this.host}:${this.port}`,
            );
            this.lastErrorLogged = false;
            this.wasConnected = true;
          }

          resolve(true);
        });

        this.socket.on("error", (err: Error) => {
          this.connected = false;

          // Logar erro apenas na primeira ocorrência
          if (!this.lastErrorLogged) {
            systemLogger.error(
              "Modbus Client",
              `Erro de conexão: ${err.message}`,
            );
            criticalAlerts.addAlert(
              "client_error",
              "critical",
              `Erro ao conectar com Slave Pool (${this.host}:${this.port}): ${err.message}`,
              { host: this.host, port: this.port, error: err.message },
            );
            this.lastErrorLogged = true;
          }

          // Só reconecta se auto-reconexão estiver habilitada
          if (this.shouldAutoReconnect && !this.reconnectInterval) {
            this.startReconnect();
          }
        });

        this.socket.on("close", () => {
          this.connected = false;

          // Logar fechamento apenas na primeira ocorrência
          if (!this.lastErrorLogged) {
            systemLogger.warning(
              "Modbus Client",
              `Conexão fechada com ${this.host}:${this.port}`,
            );

            // Só tenta reconectar se auto-reconexão estiver habilitada
            if (this.shouldAutoReconnect) {
              criticalAlerts.addAlert(
                "connection_lost",
                "warning",
                `Conexão perdida com Slave Pool (${this.host}:${this.port}). Tentando reconectar...`,
                { host: this.host, port: this.port },
              );
              systemLogger.info(
                "Modbus Client",
                `Tentando reconectar a ${this.host}:${this.port} em segundo plano...`,
              );
            }

            this.lastErrorLogged = true;
          }

          // Inicia reconexão automática se habilitado
          if (this.shouldAutoReconnect && !this.reconnectInterval) {
            this.startReconnect();
          }
        });

        this.socket.on("timeout", () => {
          systemLogger.warning(
            "Modbus Client",
            `Timeout na conexão com ${this.host}:${this.port}`,
          );
          // NÃO fecha a conexão - apenas avisa
          // this.socket.end();
        });

        this.socket.connect({ host: this.host, port: this.port });
      } catch (error) {
        this.connected = false;
        reject(error);
      }
    });
  }

  /**
   * Inicia reconexão automática (silenciosa - logs apenas na primeira falha e na reconexão bem-sucedida)
   * Usa backoff exponencial: 5s, 10s, 15s, 20s, 30s (máximo)
   */
  private startReconnect(): void {
    if (this.reconnectInterval) return;

    // Backoff exponencial: aumenta intervalo a cada tentativa falhada
    const getReconnectDelay = () => {
      if (this.reconnectAttempts < 3) return 5000; // Primeiras 3 tentativas: 5s
      if (this.reconnectAttempts < 6) return 10000; // Próximas 3: 10s
      if (this.reconnectAttempts < 10) return 15000; // Próximas 4: 15s
      if (this.reconnectAttempts < 15) return 20000; // Próximas 5: 20s
      return 30000; // Depois: 30s
    };

    const attemptReconnect = async () => {
      if (!this.connected) {
        this.reconnectAttempts++;
        try {
          await this.connect();
          if (this.connected && this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
        } catch (error) {
          // Ajusta intervalo para próxima tentativa
          if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
          }
          const delay = getReconnectDelay();
          this.reconnectInterval = setTimeout(attemptReconnect, delay);
        }
      } else {
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      }
    };

    // Primeira tentativa
    const initialDelay = getReconnectDelay();
    this.reconnectInterval = setTimeout(attemptReconnect, initialDelay) as any;
  }

  /**
   * Desconecta do servidor Modbus
   */
  disconnect(): void {
    // IMPORTANTE: Desabilitar auto-reconexão antes de fechar
    this.shouldAutoReconnect = false;

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.socket) {
      this.socket.end();
      this.socket.destroy();
    }

    this.connected = false;
    console.log(`[Modbus] Desconectado de ${this.host}:${this.port}`);
  }

  /**
   * Verifica se está conectado imediatamente (sem esperar estabilização)
   * Use para operações de leitura/escrita
   */
  isActuallyConnected(): boolean {
    return this.socket !== null && !this.socket.destroyed;
  }

  /**
   * Verifica se está conectado E a conexão está estável
   * Conexão só é considerada estável após 2 segundos sem desconectar
   * Use para reportar status ao usuário
   */
  isConnected(): boolean {
    if (!this.connected || this.socket === null || this.socket.destroyed) {
      return false;
    }

    // Verifica se a conexão está estável (mais de 2 segundos)
    const connectionAge = Date.now() - this.connectionStableTime;
    return connectionAge > 2000;
  }

  /**
   * Lê registradores (Holding Registers)
   */
  async readHoldingRegisters(
    startAddress: number,
    quantity: number,
  ): Promise<ModbusReadResponse> {
    // Verifica se socket existe e não foi destruído
    if (!this.socket || this.socket.destroyed) {
      return {
        success: false,
        error: "Cliente Modbus não conectado",
        timestamp: Date.now(),
      };
    }

    try {
      const response = await this.client.readHoldingRegisters(
        startAddress,
        quantity,
      );

      if (response.response && response.response.body) {
        return {
          success: true,
          registers: response.response.body.valuesAsArray,
          timestamp: Date.now(),
        };
      }

      return {
        success: false,
        error: "Resposta inválida do servidor Modbus",
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error(`[Modbus] Erro ao ler registradores: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Lê coils (bobinas digitais)
   */
  async readCoils(
    startAddress: number,
    quantity: number,
  ): Promise<ModbusReadResponse> {
    if (!this.socket || this.socket.destroyed) {
      return {
        success: false,
        error: "Cliente Modbus não conectado",
        timestamp: Date.now(),
      };
    }

    try {
      const response = await this.client.readCoils(startAddress, quantity);

      if (response.response && response.response.body) {
        return {
          success: true,
          coils: response.response.body.valuesAsArray,
          timestamp: Date.now(),
        };
      }

      return {
        success: false,
        error: "Resposta inválida do servidor Modbus",
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error(`[Modbus] Erro ao ler coils: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Escreve um único registrador
   */
  async writeSingleRegister(address: number, value: number): Promise<boolean> {
    if (!this.socket || this.socket.destroyed) {
      console.error("[Modbus] Cliente não conectado para escrita");
      return false;
    }

    try {
      const response = await this.client.writeSingleRegister(address, value);
      return response.response && !response.response.isError;
    } catch (error: any) {
      console.error(
        `[Modbus] Erro ao escrever registrador ${address}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Escreve uma única coil
   */
  async writeSingleCoil(address: number, value: boolean): Promise<boolean> {
    if (!this.socket || this.socket.destroyed) {
      console.error("[Modbus] Cliente não conectado para escrita");
      return false;
    }

    try {
      const response = await this.client.writeSingleCoil(address, value);
      return response.response && !response.response.isError;
    } catch (error: any) {
      console.error(
        `[Modbus] Erro ao escrever coil ${address}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Escreve múltiplos registradores
   */
  async writeMultipleRegisters(
    startAddress: number,
    values: number[],
  ): Promise<boolean> {
    if (!this.socket || this.socket.destroyed) {
      console.error("[Modbus] Cliente não conectado para escrita");
      return false;
    }

    try {
      const response = await this.client.writeMultipleRegisters(
        startAddress,
        values,
      );
      return response.response && !response.response.isError;
    } catch (error: any) {
      console.error(
        `[Modbus] Erro ao escrever múltiplos registradores: ${error.message}`,
      );
      return false;
    }
  }
}

// Singleton para gerenciar as conexões Modbus
class ModbusManager {
  private slaveClient: ModbusClient | null = null;
  private clpClient: ModbusClient | null = null;

  getSlaveClient(host: string, port: number, timeout: number): ModbusClient {
    if (!this.slaveClient) {
      this.slaveClient = new ModbusClient(host, port, timeout);
    }
    return this.slaveClient;
  }

  getCLPClient(host: string, port: number, timeout: number): ModbusClient {
    if (!this.clpClient) {
      this.clpClient = new ModbusClient(host, port, timeout);
    }
    return this.clpClient;
  }

  disconnectAll(): void {
    if (this.slaveClient) {
      this.slaveClient.disconnect();
      this.slaveClient = null;
    }
    if (this.clpClient) {
      this.clpClient.disconnect();
      this.clpClient = null;
    }
  }
}

// Usar global para garantir singleton em ambiente de desenvolvimento com hot-reload
declare global {
  var modbusManagerInstance: ModbusManager | undefined;
}

if (!global.modbusManagerInstance) {
  global.modbusManagerInstance = new ModbusManager();
}

export const modbusManager = global.modbusManagerInstance;
