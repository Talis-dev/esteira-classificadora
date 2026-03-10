// ============================================
// CONTROLADOR DA ESTEIRA CLASSIFICADORA
// Sistema com CLP Schneider usando Holding Registers
// ============================================

import { ModbusClient } from "./modbus-client";
import { systemLogger } from "./system-logger";
import {
  getCachedConveyorConfig,
  updateConveyorConfig,
} from "./conveyor-config-manager";
import {
  ConveyorSystemState,
  TrackedProduct,
  ConveyorOutput,
} from "@/types/conveyor";
import { v4 as uuidv4 } from "uuid";

export class ConveyorController {
  private client: ModbusClient | null = null;
  private running: boolean = false;
  private readInterval: NodeJS.Timeout | null = null;

  // Estado do sistema
  private state: ConveyorSystemState = {
    connected: false,
    running: false,
    cleaningMode: false,
    inputs: {
      rpmLastPulse: 0,
      fullTurnLastPulse: 0,
      triggerLastPulse: 0,
      doorOpen: false,
      inverterFault: false,
      emergencyPressed: false,
      motorRunning: false,
    },
    outputs: {
      valve1Active: false,
      valve2Active: false,
      valve3Active: false,
    },
    trackedProducts: [],
    stuckInputs: [],
    distributionMode: "manual",
    nextOutputIndex: 0,
    lastMinuteReset: Date.now(),
    stats: {
      totalDetected: 0,
      totalDiverted: 0,
      totalPassed: 0,
      outputCounts: { 1: 0, 2: 0, 3: 0 },
      outputCountsPerMinute: { 1: 0, 2: 0, 3: 0 },
      currentRPM: 0,
      currentSpeed: 0,
      piecesPerMinute: 0,
      uptime: 0,
    },
    lastUpdate: Date.now(),
    recentErrors: [],
  };

  // Controle de pulsos
  private lastInputStates: Map<string, boolean> = new Map();
  private inputStuckTimestamps: Map<string, number> = new Map(); // Tracking de inputs travados
  private lastPulseTimestamps: Map<string, number> = new Map(); // Debounce de pulsos (evita duplicatas)
  private rpmPulseCount: number = 0;
  private rpmLastCheckTime: number = Date.now();
  private startTime: number = 0;
  private minuteResetInterval: NodeJS.Timeout | null = null;
  private manualModeApplyCycleCounter: number = 0; // Contador para aplicar modos manuais periodicamente
  private detectionTimestamps: number[] = []; // Timestamps de detecções para calcular peças/min

  /**
   * Inicia o sistema
   */
  async start(): Promise<boolean> {
    if (this.running) {
      systemLogger.warning("Conveyor", "Sistema já está rodando");
      return false;
    }

    try {
      const config = getCachedConveyorConfig();

      // Conecta ao CLP em modo client
      this.client = new ModbusClient(
        config.connection.ip,
        config.connection.port,
        config.connection.timeout,
      );

      const connected = await this.client.connect();
      if (!connected) {
        throw new Error("Falha ao conectar no CLP");
      }

      this.state.connected = true;
      this.running = true;
      this.state.running = true;
      this.startTime = Date.now();

      systemLogger.success(
        "Conveyor",
        `Sistema iniciado - CLP ${config.connection.ip}:${config.connection.port}`,
      );

      // Inicia ciclo de leitura
      this.startReadCycle();

      // Inicia reset de contadores por minuto
      this.startMinuteReset();

      // Carrega modo de distribuição
      this.state.distributionMode = config.distributionMode;

      // Aplica modos manuais (force-open, force-closed)
      await this.applyManualModes();

      return true;
    } catch (error: any) {
      systemLogger.error(
        "Conveyor",
        `Erro ao iniciar sistema: ${error.message}`,
      );
      this.state.connected = false;
      this.state.running = false;
      this.running = false;
      return false;
    }
  }

  /**
   * Para o sistema
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.state.running = false;

    // Para ciclo de leitura
    if (this.readInterval) {
      clearInterval(this.readInterval);
      this.readInterval = null;
    }

    // Para reset de minuto
    if (this.minuteResetInterval) {
      clearInterval(this.minuteResetInterval);
      this.minuteResetInterval = null;
    }

    // Desliga todas as válvulas antes de desconectar
    await this.deactivateAllValves();

    // Reseta todos os HRs de saída (HR0 e HR1) para garantir que nada fique acionado
    if (this.client) {
      await this.client.writeSingleRegister(0, 0); // HR0 = 0 (cleaning mode)
      await this.client.writeSingleRegister(1, 0); // HR1 = 0 (todas as válvulas)
      systemLogger.info("Conveyor", "HRs de saída resetados (HR0, HR1 = 0)");
    }

    // Desconecta do CLP
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }

    this.state.connected = false;

    systemLogger.info("Conveyor", "Sistema parado");
  }

  /**
   * Inicia o ciclo de leitura dos inputs
   */
  private startReadCycle(): void {
    const config = getCachedConveyorConfig();

    this.readInterval = setInterval(async () => {
      if (!this.running || !this.client) return;

      try {
        // Lê HR16 (inputs) de uma vez
        const result = await this.client.readHoldingRegisterBits(16);

        if (result.success && result.bits) {
          await this.processInputs(result.bits);
        }

        // Processa produtos rastreados e ativa válvulas
        await this.processTrackedProducts();

        // Aplica modos manuais forçados (a cada ~1 segundo)
        this.manualModeApplyCycleCounter++;
        if (this.manualModeApplyCycleCounter >= 20) {
          await this.applyManualModes();
          this.manualModeApplyCycleCounter = 0;
        }

        // Calcula RPM e velocidade
        this.calculateSpeed();

        // Atualiza uptime
        this.state.stats.uptime = Date.now() - this.startTime;
        this.state.lastUpdate = Date.now();
      } catch (error: any) {
        this.addError(
          "read_cycle",
          `Erro no ciclo de leitura: ${error.message}`,
        );
      }
    }, config.readCycleMs);
  }

  /**
   * Inicia o reset automático dos contadores a cada minuto
   */
  private startMinuteReset(): void {
    this.minuteResetInterval = setInterval(() => {
      // Reseta contadores por minuto
      this.state.stats.outputCountsPerMinute = {
        1: 0,
        2: 0,
        3: 0,
      };

      this.state.lastMinuteReset = Date.now();

      systemLogger.info("Conveyor", "📊 Contadores por minuto resetados");
    }, 60000); // 60 segundos
  }

  /**
   * Trata acionamento de emergência
   * Fecha válvulas e cancela acionamentos, mas mantém sistema rodando
   */
  private async handleEmergency(): Promise<void> {
    // Fecha todas as válvulas imediatamente
    await this.deactivateAllValves();

    // Cancela todos os produtos rastreados (acionamentos pendentes)
    const canceledCount = this.state.trackedProducts.length;
    this.state.trackedProducts = [];

    systemLogger.warning(
      "Conveyor",
      `🚨 Emergência: ${canceledCount} acionamentos cancelados, válvulas fechadas`,
    );
  }

  /**
   * Aplica modos manuais forçados (force-open, force-closed)
   * Método público para permitir aplicação imediata ao alterar configuração
   */
  async applyManualModes(): Promise<void> {
    if (!this.client) return;

    const config = getCachedConveyorConfig();

    for (const output of config.conveyorOutputs) {
      if (output.manualMode === "force-open") {
        // Força válvula aberta
        const success = await this.client.setHoldingRegisterBit(
          output.address.hr,
          output.address.bit,
        );
        if (success) {
          this.updateValveState(output.id, true);
        }
      } else if (
        output.manualMode === "force-closed" ||
        output.manualMode === "disabled"
      ) {
        // Força válvula fechada
        const success = await this.client.clearHoldingRegisterBit(
          output.address.hr,
          output.address.bit,
        );
        if (success) {
          this.updateValveState(output.id, false);
        }
      }
    }
  }

  /**
   * Processa os inputs lidos do CLP
   *
   * LATCH LOGIC: Para capturar pulsos muito rápidos (< 5ms), não dependemos apenas
   * de mudança de estado. Se o bit está no estado de trigger E passou tempo suficiente
   * desde o último pulso (debounce), processamos como novo pulso.
   */
  private async processInputs(bits: boolean[]): Promise<void> {
    const config = getCachedConveyorConfig();
    const now = Date.now();
    const STUCK_PULSE_THRESHOLD_MS = 1000; // 1 segundo sem mudar = travado
    const PULSE_DEBOUNCE_MS = config.triggerDebounceMs ?? 8; // Debounce entre pulsos (evita duplicatas)

    // Limpa alertas de inputs travados
    this.state.stuckInputs = [];

    // Processa cada input
    for (const [key, input] of Object.entries(config.inputs)) {
      if (!input.enabled) continue;

      const bitValue = bits[input.address.bit];
      const lastState = this.lastInputStates.get(input.id) ?? false;
      const stateChanged = bitValue !== lastState;

      // Para inputs de pulso: verifica se bit está no estado de trigger
      const isTriggered =
        input.type === "pulse"
          ? input.normallyOn
            ? !bitValue
            : bitValue
          : false;

      if (stateChanged) {
        this.lastInputStates.set(input.id, bitValue);
        this.inputStuckTimestamps.delete(input.id); // Remove tracking se mudou

        // Loga apenas se configurado para logar
        if (input.logChanges) {
          systemLogger.debug(
            "Conveyor",
            `${input.name}: ${bitValue ? "ON" : "OFF"}`,
          );
        }

        // Processa tipos específicos na mudança de estado
        if (input.type === "pulse" && isTriggered) {
          const lastPulse = this.lastPulseTimestamps.get(input.id) ?? 0;
          if (now - lastPulse >= PULSE_DEBOUNCE_MS) {
            this.lastPulseTimestamps.set(input.id, now);
            await this.handlePulse(input.id, now);
          }
        } else if (input.type === "digital") {
          await this.handleDigitalInput(input.id, bitValue, input.normallyOn);
        }
      } else if (input.type === "pulse" && isTriggered) {
        // LATCH LOGIC: Mesmo sem mudança de estado, se o bit está triggered
        // e passou tempo suficiente desde o último pulso, processa como novo pulso
        const lastPulse = this.lastPulseTimestamps.get(input.id) ?? 0;
        if (now - lastPulse >= PULSE_DEBOUNCE_MS) {
          this.lastPulseTimestamps.set(input.id, now);
          await this.handlePulse(input.id, now);
        }
      } else if (!stateChanged) {
        // Detecta inputs de pulso travados (apenas para sensores NO)
        if (input.type === "pulse" && !input.normallyOn && bitValue) {
          if (!this.inputStuckTimestamps.has(input.id)) {
            this.inputStuckTimestamps.set(input.id, now);
          }

          const stuckTime =
            now - (this.inputStuckTimestamps.get(input.id) || now);

          if (stuckTime > STUCK_PULSE_THRESHOLD_MS) {
            // Input travado! Adiciona alerta
            this.state.stuckInputs.push({
              inputId: input.id,
              inputName: input.name,
              stuckSince: this.inputStuckTimestamps.get(input.id) || now,
              address: input.address,
            });

            // Não processa como pulso válido
            if (input.logChanges) {
              systemLogger.warning(
                "Conveyor",
                `⚠️ ${input.name} TRAVADO - ignorando pulsos infinitos`,
              );
            }
          }
        }
      }
    }
  }

  /**
   * Trata pulsos (RPM, volta completa, gatilho)
   */
  private async handlePulse(inputId: string, timestamp: number): Promise<void> {
    switch (inputId) {
      case "rpm":
        this.state.inputs.rpmLastPulse = timestamp;
        this.rpmPulseCount++;
        break;

      case "fullTurn":
        this.state.inputs.fullTurnLastPulse = timestamp;
        break;

      case "trigger":
        this.state.inputs.triggerLastPulse = timestamp;
        await this.handleProductDetection(timestamp);
        break;
    }
  }

  /**
   * Trata inputs digitais (porta, emergência, etc.)
   */
  private async handleDigitalInput(
    inputId: string,
    value: boolean,
    normallyOn: boolean,
  ): Promise<void> {
    const isNormal = value === normallyOn;

    switch (inputId) {
      case "door":
        this.state.inputs.doorOpen = !isNormal;
        if (!isNormal) {
          systemLogger.warning("Conveyor", "Porta aberta!");
        }
        break;

      case "inverter":
        this.state.inputs.inverterFault = !isNormal;
        if (!isNormal) {
          systemLogger.error("Conveyor", "Falha no inversor!");
          await this.stop();
        }
        break;

      case "emergency":
        this.state.inputs.emergencyPressed = !isNormal;
        if (!isNormal) {
          systemLogger.error(
            "Conveyor",
            "⚠️ Emergência acionada! Fechando válvulas...",
          );
          await this.handleEmergency();
        } else {
          systemLogger.info(
            "Conveyor",
            "✅ Emergência liberada - sistema normalizado",
          );
        }
        break;

      case "motor":
        this.state.inputs.motorRunning = value;
        break;
    }
  }

  /**
   * Detecta novo produto e inicia rastreamento
   */
  private async handleProductDetection(timestamp: number): Promise<void> {
    const config = getCachedConveyorConfig();

    // Ignora detecção se emergência estiver acionada
    if (this.state.inputs.emergencyPressed) {
      systemLogger.debug(
        "Conveyor",
        "🚨 Produto ignorado - emergência acionada",
      );
      return;
    }

    // Determina qual saída deve receber o produto
    const targetOutput = this.determineTargetOutput();

    if (targetOutput === null) {
      // Nenhuma saída disponível, produto passa reto
      systemLogger.debug(
        "Conveyor",
        "Produto detectado - passa reto (saídas completas)",
      );
      this.state.stats.totalDetected++;
      this.detectionTimestamps.push(timestamp); // Registra detecção para cálculo de peças/min
      this.state.stats.totalPassed++;
      return;
    }

    // Cria produto rastreado
    const product: TrackedProduct = {
      id: uuidv4(),
      outputId: targetOutput.id,
      detectedAt: timestamp,
      scheduledActivationTime: timestamp + targetOutput.delayMs,
      status: "waiting",
    };

    this.state.trackedProducts.push(product);
    this.state.stats.totalDetected++;
    this.detectionTimestamps.push(timestamp); // Registra detecção para cálculo de peças/min

    systemLogger.info(
      "Conveyor",
      `Produto #${this.state.stats.totalDetected} → ${targetOutput.name} (delay ${targetOutput.delayMs}ms)`,
    );
  }

  /**
   * Determina qual saída deve receber o próximo produto
   * Baseado no modo de distribuição: manual, equal (igual) ou percentage (porcentagem)
   */
  private determineTargetOutput(): ConveyorOutput | null {
    const config = getCachedConveyorConfig();
    const mode = this.state.distributionMode;

    // Filtra saídas habilitadas e em modo auto
    const enabledOutputs = config.conveyorOutputs.filter(
      (output) => output.enabled && output.manualMode === "auto",
    );

    if (enabledOutputs.length === 0) {
      return null;
    }

    // MODO MANUAL: Usa targetPerMinute individual para cada saída
    if (mode === "manual") {
      for (const output of enabledOutputs) {
        // Conta produtos já ativados neste minuto + produtos agendados (waiting)
        const activatedCount =
          this.state.stats.outputCountsPerMinute[output.id] || 0;
        const scheduledCount = this.state.trackedProducts.filter(
          (p) => p.outputId === output.id && p.status === "waiting",
        ).length;
        const totalCount = activatedCount + scheduledCount;

        // Se targetPerMinute é 0, aceita ilimitado
        // Se não atingiu a meta do minuto (considerando agendados), aceita
        if (
          output.targetPerMinute === 0 ||
          totalCount < output.targetPerMinute
        ) {
          return output;
        }
      }
      return null; // Todas as saídas atingiram meta
    }

    // MODO EQUAL: Alterna entre saídas igualmente (round-robin)
    if (mode === "equal") {
      // Verifica se todas atingiram meta
      const outputsWithSpace = enabledOutputs.filter((output) => {
        const activatedCount =
          this.state.stats.outputCountsPerMinute[output.id] || 0;
        const scheduledCount = this.state.trackedProducts.filter(
          (p) => p.outputId === output.id && p.status === "waiting",
        ).length;
        const totalCount = activatedCount + scheduledCount;
        return (
          output.targetPerMinute === 0 || totalCount < output.targetPerMinute
        );
      });

      if (outputsWithSpace.length === 0) {
        return null; // Todas atingiram meta
      }

      // Rotaciona entre saídas disponíveis
      let attempts = 0;
      while (attempts < enabledOutputs.length) {
        const currentOutput = enabledOutputs[this.state.nextOutputIndex];
        const activatedCount =
          this.state.stats.outputCountsPerMinute[currentOutput.id] || 0;
        const scheduledCount = this.state.trackedProducts.filter(
          (p) => p.outputId === currentOutput.id && p.status === "waiting",
        ).length;
        const totalCount = activatedCount + scheduledCount;

        // Próximo índice (circular)
        this.state.nextOutputIndex =
          (this.state.nextOutputIndex + 1) % enabledOutputs.length;

        // Verifica se tem espaço
        if (
          currentOutput.targetPerMinute === 0 ||
          totalCount < currentOutput.targetPerMinute
        ) {
          return currentOutput;
        }

        attempts++;
      }

      return null;
    }

    // MODO PERCENTAGE: Distribui baseado na porcentagem calculada pelas metas
    if (mode === "percentage") {
      // Calcula total de produtos por minuto configurado
      const totalPerMinute = enabledOutputs.reduce(
        (sum, output) => sum + (output.targetPerMinute || 0),
        0,
      );

      if (totalPerMinute === 0) {
        // Sem meta definida, usa distribuição igual
        return enabledOutputs[
          this.state.nextOutputIndex++ % enabledOutputs.length
        ];
      }

      // Encontra saída com maior déficit (diferença entre esperado e atual)
      let bestOutput: ConveyorOutput | null = null;
      let maxDeficit = -Infinity;

      for (const output of enabledOutputs) {
        if (output.targetPerMinute === 0) continue;

        const activatedCount =
          this.state.stats.outputCountsPerMinute[output.id] || 0;
        const scheduledCount = this.state.trackedProducts.filter(
          (p) => p.outputId === output.id && p.status === "waiting",
        ).length;
        const totalCount = activatedCount + scheduledCount;

        // Já atingiu meta? Pula
        if (totalCount >= output.targetPerMinute) {
          continue;
        }

        // Calcula quanto falta para atingir proporção ideal
        const expectedRatio = output.targetPerMinute / totalPerMinute;

        // Conta total de produtos enviados (ativados + agendados) para todas as saídas
        const totalSent = enabledOutputs.reduce((sum, o) => {
          const activated = this.state.stats.outputCountsPerMinute[o.id] || 0;
          const scheduled = this.state.trackedProducts.filter(
            (p) => p.outputId === o.id && p.status === "waiting",
          ).length;
          return sum + activated + scheduled;
        }, 0);

        const expectedCount = totalSent * expectedRatio;
        const deficit = expectedCount - totalCount;

        if (deficit > maxDeficit) {
          maxDeficit = deficit;
          bestOutput = output;
        }
      }

      return bestOutput;
    }

    return null;
  }

  /**
   * Processa produtos rastreados e ativa válvulas
   */
  private async processTrackedProducts(): Promise<void> {
    const now = Date.now();
    const config = getCachedConveyorConfig();

    // DEBUG: Log de produtos rastreados
    if (this.state.trackedProducts.length > 0) {
      console.log(
        `[DEBUG] ${this.state.trackedProducts.length} produtos rastreados`,
      );
    }

    // Não processa acionamentos se emergência estiver acionada
    if (this.state.inputs.emergencyPressed) {
      console.log("[DEBUG] Emergência acionada - processamento bloqueado");
      return;
    }

    for (const product of this.state.trackedProducts) {
      const timeUntilActivation = product.scheduledActivationTime - now;

      if (product.status === "waiting") {
        console.log(
          `[DEBUG] Produto ${product.id.substring(0, 8)} aguardando - faltam ${timeUntilActivation}ms`,
        );
      }

      if (
        product.status === "waiting" &&
        now >= product.scheduledActivationTime
      ) {
        console.log(
          `[DEBUG] Tentando ativar produto ${product.id.substring(0, 8)}`,
        );

        const output = config.conveyorOutputs.find(
          (o) => o.id === product.outputId,
        );

        if (!output) {
          console.log(`[DEBUG] Output ${product.outputId} não encontrado!`);
          continue;
        }

        console.log(
          `[DEBUG] Output encontrado: ${output.name}, modo: ${output.manualMode}`,
        );

        if (output) {
          // Marca como ativado ANTES para evitar loop infinito se falhar
          product.status = "activated";
          console.log(`[DEBUG] Marcado como activated ANTES de chamar valve`);

          try {
            await this.activateValve(output);
            console.log(`[DEBUG] activateValve completou para ${output.name}`);
          } catch (error: any) {
            console.error(`[DEBUG] ERRO em activateValve: ${error.message}`);
            systemLogger.error(
              "Conveyor",
              `Erro ao ativar ${output.name}: ${error.message}`,
            );
          }

          // Incrementa contadores
          const updatedOutputs = config.conveyorOutputs.map((o) =>
            o.id === output.id ? { ...o, currentCount: o.currentCount + 1 } : o,
          );
          updateConveyorConfig({ conveyorOutputs: updatedOutputs });

          this.state.stats.outputCounts[output.id]++;
          this.state.stats.outputCountsPerMinute[output.id] =
            (this.state.stats.outputCountsPerMinute[output.id] || 0) + 1;
          this.state.stats.totalDiverted++;

          const minuteCount = this.state.stats.outputCountsPerMinute[output.id];
          const target = output.targetPerMinute || 0;

          systemLogger.success(
            "Conveyor",
            `${output.name} acionada [${minuteCount}/${target === 0 ? "∞" : target} p/min]`,
          );

          // Agenda desativação
          setTimeout(async () => {
            await this.deactivateValve(output);
            product.status = "passed";
          }, output.activationMs);
        }
      }
    }

    // Limpa produtos antigos (3s é suficiente para passagem rápida)
    this.state.trackedProducts = this.state.trackedProducts.filter(
      (p) => now - p.detectedAt < 3000,
    );
  }

  /**
   * Ativa uma válvula
   */
  private async activateValve(output: ConveyorOutput): Promise<void> {
    console.log(`[DEBUG activateValve] Iniciando para ${output.name}`);

    if (!this.client) {
      console.log(`[DEBUG activateValve] Cliente não existe!`);
      return;
    }

    if (
      output.manualMode === "disabled" ||
      output.manualMode === "force-closed"
    ) {
      console.log(
        `[DEBUG activateValve] Modo manual impediu: ${output.manualMode}`,
      );
      return;
    }

    console.log(
      `[DEBUG activateValve] Chamando setHoldingRegisterBit HR${output.address.hr} bit${output.address.bit}`,
    );

    try {
      // Timeout de 2 segundos para evitar travamento
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout na escrita Modbus")), 2000),
      );

      const writePromise = this.client.setHoldingRegisterBit(
        output.address.hr,
        output.address.bit,
      );

      const success = await Promise.race([writePromise, timeoutPromise]);

      console.log(
        `[DEBUG activateValve] setHoldingRegisterBit retornou: ${success}`,
      );

      if (success) {
        this.updateValveState(output.id, true);
      } else {
        this.addError("valve", `Falha ao ativar ${output.name}`);
      }
    } catch (error: any) {
      console.error(`[DEBUG activateValve] ERRO/TIMEOUT: ${error.message}`);
      this.addError(
        "valve",
        `Timeout/Erro ao ativar ${output.name}: ${error.message}`,
      );
    }
  }

  /**
   * Desativa uma válvula
   */
  private async deactivateValve(output: ConveyorOutput): Promise<void> {
    if (!this.client) return;

    if (output.manualMode === "force-open") {
      return;
    }

    const success = await this.client.clearHoldingRegisterBit(
      output.address.hr,
      output.address.bit,
    );

    if (success) {
      this.updateValveState(output.id, false);
    } else {
      this.addError("valve", `Falha ao desativar ${output.name}`);
    }
  }

  /**
   * Desativa todas as válvulas
   */
  private async deactivateAllValves(): Promise<void> {
    const config = getCachedConveyorConfig();

    for (const output of config.conveyorOutputs) {
      await this.deactivateValve(output);
    }
  }

  /**
   * Atualiza estado da válvula
   */
  private updateValveState(outputId: number, active: boolean): void {
    switch (outputId) {
      case 1:
        this.state.outputs.valve1Active = active;
        break;
      case 2:
        this.state.outputs.valve2Active = active;
        break;
      case 3:
        this.state.outputs.valve3Active = active;
        break;
    }
  }

  /**
   * Calcula RPM, velocidade e peças por minuto
   */
  private calculateSpeed(): void {
    const config = getCachedConveyorConfig();
    const now = Date.now();
    const elapsedSeconds = (now - this.rpmLastCheckTime) / 1000;

    if (elapsedSeconds >= 1.0) {
      // Calcula RPM do eixo
      const axleRPM =
        (this.rpmPulseCount / config.rpmPulsesPerRevolution) *
        (60 / elapsedSeconds);

      // Aplica gear ratio se configurado (eixo gira mais rápido que esteira)
      const conveyorRPM = config.gearRatio
        ? axleRPM / config.gearRatio
        : axleRPM;

      this.state.stats.currentRPM = Math.round(conveyorRPM * 10) / 10;

      // Calcula velocidade linear usando diameter da esteira
      const circumference = Math.PI * config.conveyorDiameter;
      const speed = (circumference * conveyorRPM) / 60;
      this.state.stats.currentSpeed = Math.round(speed * 100) / 100;

      this.rpmPulseCount = 0;
      this.rpmLastCheckTime = now;
    }

    // Calcula peças por minuto (últimos 60 segundos)
    const oneMinuteAgo = now - 60000;
    this.detectionTimestamps = this.detectionTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo,
    );
    this.state.stats.piecesPerMinute = this.detectionTimestamps.length;
  }

  /**
   * Ativa modo de higienização
   */
  async setCleaningMode(active: boolean): Promise<boolean> {
    if (!this.client) return false;

    const config = getCachedConveyorConfig();
    const address = config.outputs.cleaningMode;

    const success = active
      ? await this.client.setHoldingRegisterBit(address.hr, address.bit)
      : await this.client.clearHoldingRegisterBit(address.hr, address.bit);

    if (success) {
      this.state.cleaningMode = active;
      systemLogger.info(
        "Conveyor",
        `Modo higienização ${active ? "ATIVADO" : "DESATIVADO"}`,
      );
    }

    return success;
  }

  /**
   * Controle manual de válvula
   */
  async setValveManual(outputId: number, active: boolean): Promise<boolean> {
    const config = getCachedConveyorConfig();
    const output = config.conveyorOutputs.find((o) => o.id === outputId);

    if (!output || !this.client) return false;

    const success = active
      ? await this.client.setHoldingRegisterBit(
          output.address.hr,
          output.address.bit,
        )
      : await this.client.clearHoldingRegisterBit(
          output.address.hr,
          output.address.bit,
        );

    if (success) {
      this.updateValveState(outputId, active);
    }

    return success;
  }

  /**
   * Atualiza modo manual de saída
   */
  async setOutputManualMode(
    outputId: number,
    mode: "auto" | "force-open" | "force-closed" | "disabled",
  ): Promise<boolean> {
    const config = getCachedConveyorConfig();
    const updatedOutputs = config.conveyorOutputs.map((o) =>
      o.id === outputId ? { ...o, manualMode: mode } : o,
    );

    updateConveyorConfig({ conveyorOutputs: updatedOutputs });

    if (mode === "force-open") {
      const output = updatedOutputs.find((o) => o.id === outputId);
      if (output) await this.setValveManual(outputId, true);
    } else if (mode === "force-closed" || mode === "disabled") {
      await this.setValveManual(outputId, false);
    }

    systemLogger.info("Conveyor", `Saída ${outputId} → modo ${mode}`);
    return true;
  }

  /**
   * Adiciona erro
   */
  private addError(type: string, message: string): void {
    this.state.recentErrors.push({
      timestamp: Date.now(),
      type,
      message,
    });

    if (this.state.recentErrors.length > 10) {
      this.state.recentErrors.shift();
    }

    systemLogger.error("Conveyor", message);
  }

  /**
   * Obtém estado
   */
  getState(): ConveyorSystemState {
    return { ...this.state };
  }

  /**
   * Compatibilidade com rotas legadas
   */
  getSystemState(): ConveyorSystemState {
    return this.getState();
  }

  /**
   * Compatibilidade com rota legada de filas
   */
  getQueueManager() {
    return {
      clearQueue: (outputId: number) => {
        const before = this.state.trackedProducts.length;
        this.state.trackedProducts = this.state.trackedProducts.filter(
          (product) => product.outputId !== outputId,
        );
        const removed = before - this.state.trackedProducts.length;
        systemLogger.warning(
          "Conveyor",
          `Fila da saída ${outputId} limpa (${removed} itens removidos)`,
        );
      },
      clearAllQueues: () => {
        const removed = this.state.trackedProducts.length;
        this.state.trackedProducts = [];
        systemLogger.warning(
          "Conveyor",
          `Todas as filas limpas (${removed} itens removidos)`,
        );
      },
      clearLogs: () => {
        systemLogger.clearLogs();
      },
    };
  }

  /**
   * Verifica se está rodando
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.state.connected && this.client !== null;
  }

  /**
   * Reseta contadores
   */
  resetCounters(): void {
    const config = getCachedConveyorConfig();

    const updatedOutputs = config.conveyorOutputs.map((o) => ({
      ...o,
      currentCount: 0,
    }));
    updateConveyorConfig({ conveyorOutputs: updatedOutputs });

    this.state.stats.totalDetected = 0;
    this.state.stats.totalDiverted = 0;
    this.state.stats.totalPassed = 0;
    this.state.stats.outputCounts = { 1: 0, 2: 0, 3: 0 };

    systemLogger.info("Conveyor", "Contadores resetados");
  }
}

// Singleton global
declare global {
  var conveyorController: ConveyorController | undefined;
}

if (!global.conveyorController) {
  global.conveyorController = new ConveyorController();
}

export const conveyorController = global.conveyorController;
