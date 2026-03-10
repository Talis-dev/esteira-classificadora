// ============================================
// TIPOS E INTERFACES DA ESTEIRA CLASSIFICADORA
// Sistema com CLP Schneider usando Holding Registers
// ============================================

/**
 * Endereço Modbus no formato HR + Bit
 */
export interface ModbusAddress {
  hr: number; // Holding Register (0-65535)
  bit: number; // Bit dentro do HR (0-15)
}

/**
 * Configuração de entrada (sensor) do CLP
 */
export interface ConveyorInput {
  id: string; // ID único (ex: "rpm", "gatilho", "porta")
  name: string; // Nome descritivo
  address: ModbusAddress; // Endereço HR+bit
  type: "pulse" | "digital"; // Tipo: pulso (RPM, gatilho) ou digital (porta, emergência)
  normallyOn: boolean; // Se estado normal é ON (ex: emergência, porta)
  enabled: boolean; // Se está habilitado para leitura
  logChanges: boolean; // Se deve logar mudanças de estado (false para RPM)
}

/**
 * Configuração de saída (válvula/atuador) do CLP
 */
export interface ConveyorOutput {
  id: number; // ID da saída (1-3 para válvulas dos braços)
  name: string; // Nome da saída (ex: "Válvula Braço 1")
  address: ModbusAddress; // Endereço HR+bit
  delayMs: number; // Tempo de atraso após gatilho (ms) - distância até o braço
  activationMs: number; // Tempo que fica acionado (ms)
  enabled: boolean; // Saída habilitada
  manualMode: "auto" | "force-open" | "force-closed" | "disabled"; // Modo manual
  targetPerMinute: number; // Meta de produtos por minuto (0 = desabilitado)
  currentCount: number; // Contador atual de produtos desviados no minuto
  targetCount: number; // DEPRECATED: Usar targetPerMinute
}

/**
 * Produto sendo rastreado na esteira
 */
export interface TrackedProduct {
  id: string; // ID único do produto
  outputId: number; // Saída de destino (1-3, ou 0 para passar reto)
  detectedAt: number; // Timestamp quando foi detectado
  scheduledActivationTime: number; // Timestamp programado de ativação da válvula
  status: "waiting" | "activated" | "passed";
}

/**
 * Informação sobre input travado
 */
export interface StuckInputAlert {
  inputId: string;
  inputName: string;
  stuckSince: number;
  address: ModbusAddress;
}

/**
 * Configuração de conexão Modbus
 */
export interface ModbusConnectionConfig {
  ip: string;
  port: number;
  timeout: number;
}

/**
 * Configuração completa da esteira classificadora
 */
export interface ConveyorSystemConfig {
  // Conexão Modbus com CLP (modo client - CLP é servidor)
  connection: ModbusConnectionConfig;

  // Endereços de entrada (leitura do CLP)
  inputs: {
    rpmPulse: ConveyorInput; // HR16 bit0 - Pulso de RPM
    fullTurnPulse: ConveyorInput; // HR16 bit1 - Pulso de volta completa
    triggerPulse: ConveyorInput; // HR16 bit2 - Pulso do sensor de gatilho
    doorSensor: ConveyorInput; // HR16 bit3 - Sensor de porta (normalmente ON)
    inverterOk: ConveyorInput; // HR16 bit4 - Inversor sem falha (ON)
    emergencyOk: ConveyorInput; // HR16 bit5 - Emergência normal (ON)
    motorRunning: ConveyorInput; // HR16 bit6 - Motor da esteira rodando (OFF normalmente)
  };

  // Endereços de saída (escrita no CLP)
  outputs: {
    cleaningMode: ModbusAddress; // HR0 bit0 - Ativa modo higienização
    valve1: ModbusAddress; // HR1 bit0 - Válvula braço 1
    valve2: ModbusAddress; // HR1 bit1 - Válvula braço 2
    valve3: ModbusAddress; // HR1 bit2 - Válvula braço 3
  };

  // Configurações dos braços/saídas
  conveyorOutputs: ConveyorOutput[];

  // Modo de distribuição de produtos
  distributionMode: "manual" | "equal" | "percentage"; // manual=usa targetCount, equal=alterna igualmente, percentage=divide por %

  // Configurações da esteira
  readCycleMs: number; // Intervalo de leitura (padrão: 50ms para capturar pulsos rápidos)
  rpmPulsesPerRevolution: number; // Pulsos por revolução do eixo (para cálculo de velocidade)
  conveyorDiameter: number; // Diâmetro do tambor da esteira (metros) para cálculo de velocidade linear
  gearRatio?: number; // Relação de transmissão eixo:esteira (ex: 10 = eixo gira 10x mais rápido que esteira)
  axleDiameter?: number; // Diâmetro do eixo de tração (metros) - alternativa ao gearRatio
  triggerDebounceMs?: number; // Debounce do sensor gatilho em ms (padrão: 8ms) - evita pulsos duplicados

  // Sistema ativo
  systemActive: boolean;
}

/**
 * Estado em tempo real do sistema
 */
export interface ConveyorSystemState {
  connected: boolean;
  running: boolean;
  cleaningMode: boolean;

  // Estado das entradas
  inputs: {
    rpmLastPulse: number;
    fullTurnLastPulse: number;
    triggerLastPulse: number;
    doorOpen: boolean;
    inverterFault: boolean;
    emergencyPressed: boolean;
    motorRunning: boolean;
  };

  // Estado das saídas
  outputs: {
    valve1Active: boolean;
    valve2Active: boolean;
    valve3Active: boolean;
  };

  // Produtos sendo rastreados
  trackedProducts: TrackedProduct[];

  // Alertas de inputs travados
  stuckInputs: StuckInputAlert[];

  // Modo de distribuição atual
  distributionMode: "manual" | "equal" | "percentage";
  nextOutputIndex: number; // Próxima saída para distribuição igual (0-2)
  lastMinuteReset: number; // Timestamp do último reset de minuto

  // Estatísticas
  stats: {
    totalDetected: number;
    totalDiverted: number;
    totalPassed: number;
    outputCounts: Record<number, number>; // Contador por saída
    outputCountsPerMinute: Record<number, number>; // Contador por minuto
    currentRPM: number;
    currentSpeed: number; // m/s
    piecesPerMinute: number; // Peças detectadas por minuto
    uptime: number;
  };

  // Última atualização
  lastUpdate: number;

  // Erros recentes
  recentErrors: Array<{
    timestamp: number;
    type: string;
    message: string;
  }>;
}

/**
 * Configuração padrão do sistema
 */
export const DEFAULT_CONVEYOR_CONFIG: ConveyorSystemConfig = {
  connection: {
    ip: "192.168.3.115",
    port: 502,
    timeout: 5000,
  },

  inputs: {
    rpmPulse: {
      id: "rpm",
      name: "Pulso RPM",
      address: { hr: 16, bit: 0 },
      type: "pulse",
      normallyOn: false,
      enabled: true,
      logChanges: false, // Não logar pulsos de RPM
    },
    fullTurnPulse: {
      id: "fullTurn",
      name: "Volta Completa",
      address: { hr: 16, bit: 1 },
      type: "pulse",
      normallyOn: false,
      enabled: true,
      logChanges: false,
    },
    triggerPulse: {
      id: "trigger",
      name: "Gatilho Produto",
      address: { hr: 16, bit: 2 },
      type: "pulse",
      normallyOn: false,
      enabled: true,
      logChanges: true,
    },
    doorSensor: {
      id: "door",
      name: "Sensor Porta",
      address: { hr: 16, bit: 3 },
      type: "digital",
      normallyOn: true, // Porta fechada = ON
      enabled: true,
      logChanges: true,
    },
    inverterOk: {
      id: "inverter",
      name: "Inversor OK",
      address: { hr: 16, bit: 4 },
      type: "digital",
      normallyOn: true, // Sem falha = ON
      enabled: true,
      logChanges: true,
    },
    emergencyOk: {
      id: "emergency",
      name: "Emergência OK",
      address: { hr: 16, bit: 5 },
      type: "digital",
      normallyOn: true, // Normal = ON
      enabled: true,
      logChanges: true,
    },
    motorRunning: {
      id: "motor",
      name: "Motor Rodando",
      address: { hr: 16, bit: 6 },
      type: "digital",
      normallyOn: false, // Parado = OFF
      enabled: true,
      logChanges: true,
    },
  },

  outputs: {
    cleaningMode: { hr: 0, bit: 0 },
    valve1: { hr: 1, bit: 0 },
    valve2: { hr: 1, bit: 1 },
    valve3: { hr: 1, bit: 2 },
  },

  conveyorOutputs: [
    {
      id: 1,
      name: "Braço 1",
      address: { hr: 1, bit: 0 },
      delayMs: 2000, // 2 segundos até o braço 1
      activationMs: 500, // 500ms acionado
      enabled: true,
      manualMode: "auto",
      targetPerMinute: 0, // 0 = ilimitado
      targetCount: 0, // DEPRECATED
      currentCount: 0,
    },
    {
      id: 2,
      name: "Braço 2",
      address: { hr: 1, bit: 1 },
      delayMs: 4000, // 4 segundos até o braço 2
      activationMs: 500,
      enabled: true,
      manualMode: "auto",
      targetPerMinute: 0,
      targetCount: 0,
      currentCount: 0,
    },
    {
      id: 3,
      name: "Braço 3",
      address: { hr: 1, bit: 2 },
      delayMs: 6000, // 6 segundos até o braço 3
      activationMs: 500,
      enabled: true,
      manualMode: "auto",
      targetPerMinute: 0,
      targetCount: 0,
      currentCount: 0,
    },
  ],

  distributionMode: "manual", // Padrão: manual (usa targetPerMinute individual)

  readCycleMs: 5, // 5ms para máxima taxa de captura de pulsos rápidos (200 Hz)
  rpmPulsesPerRevolution: 1, // 1 pulso por volta do eixo
  conveyorDiameter: 0.3, // 30cm de diâmetro da esteira
  gearRatio: 1, // Relação 1:1 (ajustar conforme sistema mecânico)
  axleDiameter: 0.03, // 30mm de diâmetro do eixo de tração
  triggerDebounceMs: 8, // 8ms de debounce para evitar pulsos duplicados

  systemActive: false,
};
