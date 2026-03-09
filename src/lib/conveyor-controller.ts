// ============================================
// CONTROLADOR PRINCIPAL DA ESTEIRA
// ============================================

import { modbusManager } from "./modbus-client";
import { ModbusServer } from "./modbus-server";
import { QueueManager } from "./queue-manager";
import { SystemConfig, SystemState, OutputSensor } from "@/types";
import { systemLogger } from "./system-logger";

export class ConveyorController {
  private config: SystemConfig;
  private queueManager: QueueManager;
  private running: boolean = false;
  private cycleInterval: NodeJS.Timeout | null = null;
  private modbusServer: ModbusServer | null = null; // Servidor para CLP
  private slavePoolServer: ModbusServer | null = null; // Servidor para Slave Pool
  private lastErrorLog: number = 0;
  private errorCount: number = 0;
  private firstErrorTime?: number;
  private autoStopScheduled: boolean = false;
  private cleaningMode: boolean = false; // Modo fachina

  // Estado dos sensores de entrada (últimos valores lidos)
  private lastInputStates: boolean[] = [];

  // Estado dos sensores de saída
  private outputSensors: Map<number, OutputSensor> = new Map();

  constructor(config: SystemConfig) {
    this.config = config;
    this.queueManager = new QueueManager(config.outputs);

    // Inicializa sensores de saída
    config.outputs.forEach((output) => {
      this.outputSensors.set(output.id, {
        outputId: output.id,
        activated: false,
        lastActivation: 0,
      });
    });
  }

  /**
   * Inicia o controlador
   */
  async start(): Promise<boolean> {
    if (this.running) {
      systemLogger.info("Controller", "Sistema já está em execução");
      return true;
    }

    try {
      // CONEXÃO SLAVE POOL - Configurável (Client ou Server)
      if (this.config.slaveMode === "client") {
        // Modo Client: Conecta ao Slave Pool
        const slaveClient = modbusManager.getSlaveClient(
          this.config.slaveIp,
          this.config.slavePort,
          this.config.slaveTimeout,
        );
        await slaveClient.connect();
        systemLogger.success(
          "Controller",
          `Conectado ao Slave Pool (Client) ${this.config.slaveIp}:${this.config.slavePort}`,
        );
      } else {
        // Modo Server: Aguarda Slave Pool conectar
        if (!this.slavePoolServer) {
          this.slavePoolServer = new ModbusServer(this.config.slavePort);
        }
        await this.slavePoolServer.start();
        systemLogger.success(
          "Controller",
          `Servidor Slave Pool iniciado na porta ${this.config.slavePort}`,
        );
        systemLogger.info(
          "Controller",
          `Aguardando Slave Pool conectar em 0.0.0.0:${this.config.slavePort}`,
        );
      }

      // CONEXÃO CLP - Configurável (Client ou Server)
      if (this.config.clpMode === "server") {
        // Modo Server: Aguarda CLP conectar
        this.modbusServer = new ModbusServer(this.config.clpPort);
        await this.modbusServer.start();

        // Configura tempos de motor ativo nos holding registers
        const engineDurations = this.config.outputs.map(
          (output) => output.activeEngineDuration,
        );
        this.modbusServer.setEngineActiveDurations(engineDurations);

        systemLogger.info(
          "Controller",
          `Aguardando CLP conectar (Server) na porta ${this.config.clpPort}`,
        );
      } else {
        // Modo Client: Conecta no CLP
        const clpClient = modbusManager.getCLPClient(
          this.config.clpIp,
          this.config.clpPort,
          this.config.clpTimeout,
        );
        await clpClient.connect();

        // Escreve tempos de motor ativo nos holding registers do CLP
        // Usa endereço individual configurado em cada saída (motorTimeHRAddress)
        for (const output of this.config.outputs) {
          const hrAddress = output.motorTimeHRAddress || 1;
          await clpClient.writeSingleRegister(
            hrAddress,
            output.activeEngineDuration,
          );
        }

        const hrAddresses = this.config.outputs
          .map((o) => o.motorTimeHRAddress || 1)
          .join(", ");
        const engineDurations = this.config.outputs
          .map((o) => o.activeEngineDuration)
          .join(", ");

        systemLogger.success(
          "Controller",
          `Conectado ao CLP (Client) ${this.config.clpIp}:${this.config.clpPort}`,
        );
        systemLogger.info(
          "Controller",
          `Tempos de motor escritos no CLP (HRs ${hrAddresses}): ${engineDurations} ms`,
        );
      }

      this.running = true;
      this.startCycle();

      systemLogger.success("Controller", "Sistema iniciado com sucesso");
      return true;
    } catch (error: any) {
      systemLogger.error(
        "Controller",
        `Erro ao iniciar sistema: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Para o controlador
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }

    // Para o servidor Modbus CLP e aguarda fechar
    if (this.modbusServer) {
      await this.modbusServer.stop();
      this.modbusServer = null;
    }

    // Para o servidor Modbus Slave Pool e aguarda fechar
    if (this.slavePoolServer) {
      await this.slavePoolServer.stop();
      this.slavePoolServer = null;
    }

    modbusManager.disconnectAll();
    systemLogger.info("Controller", "Sistema parado completamente");
  }

  /**
   * Inicia o ciclo de leitura/escrita
   */
  private startCycle(): void {
    this.cycleInterval = setInterval(async () => {
      await this.executeCycle();
    }, this.config.readCycleMs);
  }

  /**
   * Executa um ciclo completo
   */
  private async executeCycle(): Promise<void> {
    try {
      // 1. Ler sensores de entrada (pulsos de produtos)
      await this.readInputSensors();

      // 2. Processar filas e determinar ativações
      const activations = this.queueManager.processQueues();

      // 3. Enviar comandos para o CLP
      await this.writeOutputCommands(activations);
    } catch (error: any) {
      this.handleReadError(`Erro no ciclo: ${error.message}`);
    }
  }

  /**
   * Gerencia erros de leitura Modbus - apenas registra, nunca para o sistema
   * Sistema deve permanecer ativo aguardando reconexão automática
   */
  private handleReadError(message: string): void {
    const now = Date.now();

    // Registra primeiro erro
    if (!this.firstErrorTime) {
      this.firstErrorTime = now;
      this.errorCount = 1;
      systemLogger.error("Controller", message);
      systemLogger.info(
        "Controller",
        "Sistema permanece ativo aguardando reconexão...",
      );
      return;
    }

    this.errorCount++;

    // Calcula tempo decorrido desde o primeiro erro
    const elapsedSeconds = (now - this.firstErrorTime) / 1000;

    // Log periódico - apenas a cada 10 segundos para não poluir console
    if (!this.lastErrorLog || now - this.lastErrorLog > 10000) {
      systemLogger.warning(
        "Controller",
        `Aguardando reconexão... (${this.errorCount} tentativas em ${elapsedSeconds.toFixed(1)}s)`,
      );
      systemLogger.info(
        "Controller",
        "Sistema continua ativo - reconexão automática em andamento",
      );
      this.lastErrorLog = now;
    }

    // IMPORTANTE: Sistema NUNCA para automaticamente em modo operação
    // Apenas aguarda reconexão do Slave Pool ou CLP
  }

  /**
   * Reseta contador de erros após leitura bem-sucedida (reconexão)
   */
  private resetErrorCounter(): void {
    if (this.errorCount > 0) {
      const elapsedSeconds = this.firstErrorTime
        ? ((Date.now() - this.firstErrorTime) / 1000).toFixed(1)
        : "0";
      systemLogger.success(
        "Controller",
        `Reconectado com sucesso após ${this.errorCount} tentativas (${elapsedSeconds}s offline)`,
      );
      systemLogger.success("Controller", "Sistema operando normalmente");
    }
    this.errorCount = 0;
    this.firstErrorTime = undefined;
    this.lastErrorLog = 0;
    this.autoStopScheduled = false;
  }

  /**
   * Lê os sensores de entrada (pulsos Modbus do Slave)
   */
  private async readInputSensors(): Promise<void> {
    try {
      let coilsData: boolean[] = [];

      // Determina de onde ler baseado no modo
      if (this.config.slaveMode === "server") {
        // Modo Server: lê dos buffers do próprio servidor
        if (!this.slavePoolServer) return;

        // Lê cada coil individualmente do buffer do servidor usando os inputAddress das outputs
        for (const output of this.config.outputs) {
          const coilValue = this.slavePoolServer.readCoil(output.inputAddress);
          coilsData.push(coilValue);
        }
      } else {
        // Modo Client: lê do cliente Modbus conectado ao Slave Pool
        const slaveClient = modbusManager.getSlaveClient(
          this.config.slaveIp,
          this.config.slavePort,
          this.config.slaveTimeout,
        );

        if (!slaveClient.isActuallyConnected()) return;

        const inputAddresses = this.config.outputs.map((o) => o.inputAddress);
        const startAddress = Math.min(...inputAddresses);
        const maxAddress = Math.max(...inputAddresses);
        const quantity = maxAddress - startAddress + 1;

        // Valida endereços antes de ler
        if (startAddress < 0 || quantity <= 0 || quantity > 2000) {
          this.handleReadError(
            `Endereços inválidos: start=${startAddress}, quantity=${quantity}`,
          );
          return;
        }

        const response = await slaveClient.readCoils(startAddress, quantity);

        if (!response.success || !response.coils) {
          this.handleReadError(
            `Falha ao ler sensores (addr: ${startAddress}, qty: ${quantity})`,
          );
          return;
        }

        // Mapeia os valores lidos para cada output baseado no inputAddress
        for (const output of this.config.outputs) {
          const index = output.inputAddress - startAddress;
          coilsData.push(response.coils[index] || false);
        }
      }

      // Sucesso - reseta contador de erros
      this.resetErrorCounter();

      // Detecta pulsos (transição de 0 para 1)
      coilsData.forEach((currentState, index) => {
        const previousState = this.lastInputStates[index] || false;

        // Detectou pulso (borda de subida)
        if (currentState && !previousState) {
          const output = this.config.outputs[index];
          if (output && output.enabled) {
            systemLogger.info(
              "Controller",
              `Pulso detectado no inputAddress ${output.inputAddress} - Produto para saída ${output.id} (${output.name})`,
            );

            // Adiciona produto à fila (usa o ID da saída como tipo de produto)
            this.queueManager.addProduct(output.id);
          }
        }
      });

      // Atualiza estados
      this.lastInputStates = coilsData;
    } catch (error: any) {
      this.handleReadError(error.message || "Erro desconhecido");
    }
  }

  /**
   * Envia comandos de ativação para o CLP
   */
  private async writeOutputCommands(
    activations: Map<number, boolean>,
  ): Promise<void> {
    try {
      // Determina como escrever baseado no modo CLP
      if (this.config.clpMode === "server") {
        // Modo Server: sistema aguarda CLP conectar, escreve nos buffers do servidor
        if (!this.modbusServer) return;

        for (const output of this.config.outputs) {
          const shouldActivate = activations.get(output.id) || false;
          this.modbusServer.writeCoil(output.outputAddress, shouldActivate);

          // Atualiza estado do sensor
          const sensor = this.outputSensors.get(output.id);
          if (sensor) {
            const wasActivated = sensor.activated;
            sensor.activated = shouldActivate;

            if (shouldActivate && !wasActivated) {
              const pulseDuration = output.pulseDuration || 500;
              sensor.lastActivation = Date.now();
              systemLogger.info(
                "Controller",
                `Pulso ${pulseDuration}ms enviado para saída ${output.id} (${output.name}) - Coil ${output.outputAddress}`,
              );
            }
          }
        }
      } else {
        // Modo Client: sistema conecta ao CLP, escreve via cliente
        const clpClient = modbusManager.getCLPClient(
          this.config.clpIp,
          this.config.clpPort,
          this.config.clpTimeout,
        );

        if (!clpClient.isActuallyConnected()) return;

        for (const output of this.config.outputs) {
          const shouldActivate = activations.get(output.id) || false;

          // Escreve via cliente Modbus
          await clpClient.writeSingleCoil(output.outputAddress, shouldActivate);

          // Atualiza estado do sensor
          const sensor = this.outputSensors.get(output.id);
          if (sensor) {
            const wasActivated = sensor.activated;
            sensor.activated = shouldActivate;

            if (shouldActivate && !wasActivated) {
              const pulseDuration = output.pulseDuration || 500;
              sensor.lastActivation = Date.now();
              systemLogger.info(
                "Controller",
                `Pulso ${pulseDuration}ms enviado para saída ${output.id} (${output.name}) - Coil ${output.outputAddress}`,
              );
            }
          }
        }
      }
    } catch (error: any) {
      this.handleReadError(`Erro ao escrever outputs: ${error.message}`);
    }
  }

  /**
   * Obtém o estado atual do sistema
   */
  getSystemState(): SystemState {
    const slaveClient = modbusManager.getSlaveClient(
      this.config.slaveIp,
      this.config.slavePort,
      this.config.slaveTimeout,
    );

    const stats = this.queueManager.getStats();

    // Slave Pool conectado depende do modo:
    // - Modo Server: verifica se tem clientes conectados
    // - Modo Client: verifica se o cliente está conectado
    let slaveConnected = false;
    if (this.config.slaveMode === "server") {
      slaveConnected = this.slavePoolServer?.hasClients() || false;
    } else {
      // Modo client: verificar se o cliente Slave está conectado
      slaveConnected = slaveClient.isConnected();
    }

    // CLP conectado depende do modo:
    // - Modo Server: verifica se tem clientes conectados
    // - Modo Client: verifica se o cliente está conectado
    let clpConnected = false;
    if (this.config.clpMode === "server") {
      clpConnected = this.modbusServer?.hasClients() || false;
    } else {
      // Modo client: verificar se o cliente CLP está conectado
      const clpClient = modbusManager.getCLPClient(
        this.config.clpIp,
        this.config.clpPort,
        this.config.clpTimeout,
      );
      clpConnected = clpClient.isConnected();
    }

    return {
      connected: this.running,
      slaveConnected: slaveConnected,
      clpConnected: clpConnected,
      slaveMode: this.config.slaveMode,
      clpMode: this.config.clpMode,
      cleaningMode: this.cleaningMode,
      queues: this.queueManager.getAllQueues(),
      sensors: Array.from(this.outputSensors.values()),
      totalProductsProcessed: stats.totalProcessed,
      totalProductsCancelled: stats.totalCancelled,
      lastUpdate: Date.now(),
      errors: [],
    };
  }

  /**
   * Obtém o gerenciador de filas
   */
  getQueueManager(): QueueManager {
    return this.queueManager;
  }

  /**
   * Atualiza a configuração
   */
  async updateConfig(config: SystemConfig): Promise<void> {
    this.config = config;
    // Reinicializa o queue manager com as novas configurações
    this.queueManager = new QueueManager(config.outputs);

    // Atualiza tempos de motor ativo nos holding registers
    const engineDurations = config.outputs.map(
      (output) => output.activeEngineDuration,
    );

    if (this.modbusServer) {
      // Modo Server: escreve nos buffers locais
      this.modbusServer.setEngineActiveDurations(engineDurations);
    } else if (this.config.clpMode === "client") {
      // Modo Client: escreve nos HRs do CLP remoto
      const clpClient = modbusManager.getCLPClient(
        this.config.clpIp,
        this.config.clpPort,
        this.config.clpTimeout,
      );

      if (clpClient.isActuallyConnected()) {
        // Escreve cada tempo de motor no HR correspondente usando endereço individual
        for (const output of this.config.outputs) {
          const hrAddress = output.motorTimeHRAddress || 1;
          await clpClient.writeSingleRegister(
            hrAddress,
            output.activeEngineDuration,
          );
        }

        const hrAddresses = this.config.outputs
          .map((o) => o.motorTimeHRAddress || 1)
          .join(", ");
        const durations = this.config.outputs
          .map((o) => o.activeEngineDuration)
          .join(", ");
        systemLogger.info(
          "Controller",
          `Tempos de motor atualizados no CLP (HRs ${hrAddresses}): ${durations} ms`,
        );
      }
    }

    systemLogger.info("Controller", "Configuração atualizada");
  }

  /**
   * Alterna o modo fachina (limpeza)
   */
  toggleCleaningMode(): boolean {
    if (!this.running) {
      systemLogger.warning(
        "Controller",
        "Não é possível alternar modo fachina - sistema não está rodando",
      );
      return false;
    }

    this.cleaningMode = !this.cleaningMode;

    // Escreve no coil configurado baseado no modo CLP
    if (this.config.clpMode === "server") {
      // Modo Server: escreve nos buffers do servidor
      if (!this.modbusServer) return false;
      this.modbusServer.writeCoil(
        this.config.cleaningModeCoil,
        this.cleaningMode,
      );
    } else {
      // Modo Client: escreve via cliente
      const clpClient = modbusManager.getCLPClient(
        this.config.clpIp,
        this.config.clpPort,
        this.config.clpTimeout,
      );
      if (!clpClient.isActuallyConnected()) return false;
      clpClient.writeSingleCoil(
        this.config.cleaningModeCoil,
        this.cleaningMode,
      );
    }

    systemLogger.success(
      "Controller",
      `Modo fachina ${this.cleaningMode ? "ATIVADO" : "DESATIVADO"}`,
    );
    return this.cleaningMode;
  }

  /**
   * Obtém estado do modo fachina
   */
  isCleaningMode(): boolean {
    return this.cleaningMode;
  }
}
