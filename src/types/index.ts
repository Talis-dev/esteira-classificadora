// ============================================
// TIPOS E INTERFACES DO SISTEMA DE ESTEIRA
// ============================================

/**
 * Configuração de uma saída lateral da esteira
 */
export interface OutputConfig {
  id: number; // 1-6
  name: string; // Nome da saída
  delayTime: number; // Tempo até produto chegar (4s, 8s, 12s, 16s, 20s, 24s)
  toleranceTime: number; // Tempo de tolerância (padrão: 1s)
  pulseDuration: number; // Duração do pulso de saída em ms (padrão: 500ms)
  activeEngineDuration: number; // Tempo de motor ativo em ms (escrito em holding register para CLP)
  motorTimeHRAddress: number; // Endereço do HR onde será escrito o tempo de motor (1-12, bloqueado 0)
  inputAddress: number; // Endereço Modbus da coil de ENTRADA (1-6) - pulsos recebidos
  outputAddress: number; // Endereço Modbus da coil de SAÍDA (6-11) - pulsos enviados ao CLP
  enabled: boolean; // Saída habilitada
}

/**
 * Produto sendo rastreado na esteira
 */
export interface Product {
  id: string; // ID único do produto
  outputId: number; // Saída de destino (1-6, ou 0 para produto nulo)
  detectedAt: number; // Timestamp quando foi detectado
  expectedArrivalTime: number; // Timestamp esperado de chegada
  maxArrivalTime: number; // Tempo máximo com tolerância
  status: "waiting" | "in-transit" | "arrived" | "cancelled" | "timeout";
}

/**
 * Fila de produtos para cada saída
 */
export interface OutputQueue {
  outputId: number;
  products: Product[];
  blocked: boolean; // Se há caixa na saída bloqueando
  lastUpdate: number;
}

/**
 * Estado do sensor de entrada (pulso Modbus)
 */
export interface InputSensor {
  address: number; // Endereço Modbus (coil)
  productType: number; // Tipo de produto (1-6, corresponde à saída)
  lastPulse: number; // Timestamp do último pulso
  pulseDuration: number; // Duração do pulso (ms)
}

/**
 * Estado do sensor na saída
 */
export interface OutputSensor {
  outputId: number;
  activated: boolean; // Se está enviando pulso de liberação
  lastActivation: number; // Timestamp da última ativação
}

/**
 * Configuração global do sistema
 */
export interface SystemConfig {
  // Modbus Slave (leitura de pulsos)
  slaveMode: "client" | "server"; // Modo de conexão: client (conecta) ou server (aguarda)
  slaveIp: string;
  slavePort: number;
  slaveTimeout: number;

  // Modbus Master/CLP (escrita de comandos)
  clpMode: "client" | "server"; // Modo de conexão: client (conecta) ou server (aguarda)
  clpIp: string;
  clpPort: number;
  clpTimeout: number;
  motorTimesStartAddress: number; // Endereço inicial dos HRs de tempo de motor (padrão: 1 para pular HR 0 se reservado para coils)

  // Configurações da esteira
  conveyorLength: number; // Comprimento total (metros)
  conveyorSpeed: number; // Velocidade (m/s)

  // Configurações das saídas
  outputs: OutputConfig[];

  // Sensores de entrada
  inputSensors: InputSensor[];

  // Ciclo de leitura
  readCycleMs: number; // Intervalo de leitura (padrão: 100ms)

  // Modo Fachina (limpeza)
  cleaningModeCoil: number; // Coil para ativar modo fachina (padrão: 20)

  // Sistema ativo
  systemActive: boolean;
}

/**
 * Estado em tempo real do sistema
 */
export interface SystemState {
  connected: boolean;
  slaveConnected: boolean;
  clpConnected: boolean;
  slaveMode: "client" | "server"; // Modo de conexão do Slave Pool
  clpMode: "client" | "server"; // Modo de conexão do CLP
  cleaningMode: boolean; // Modo fachina ativo
  queues: OutputQueue[];
  sensors: OutputSensor[];
  totalProductsProcessed: number;
  totalProductsCancelled: number;
  lastUpdate: number;
  errors: SystemError[];
}

/**
 * Erro do sistema
 */
export interface SystemError {
  timestamp: number;
  type: "connection" | "timeout" | "sensor" | "modbus" | "queue";
  message: string;
  outputId?: number;
  productId?: string;
}

/**
 * Estatísticas do sistema
 */
export interface SystemStats {
  uptime: number;
  totalProducts: number;
  productsByOutput: Record<number, number>;
  averageProcessingTime: number;
  errorRate: number;
}

/**
 * Comando Modbus para escrita
 */
export interface ModbusWriteCommand {
  address: number;
  value: number | boolean;
  timestamp: number;
}

/**
 * Resposta de leitura Modbus
 */
export interface ModbusReadResponse {
  success: boolean;
  registers?: number[];
  coils?: boolean[];
  error?: string;
  timestamp: number;
}

/**
 * Log de evento do sistema
 */
export interface SystemLog {
  id: string;
  timestamp: number;
  level: "info" | "warning" | "error" | "success";
  category: "modbus" | "queue" | "sensor" | "product" | "system";
  message: string;
  metadata?: Record<string, any>;
}
