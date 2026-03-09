// ============================================
// CONFIGURAÇÃO PADRÃO DO SISTEMA
// ============================================

import { SystemConfig } from "@/types";

export const defaultConfig: SystemConfig = {
  // Modbus Slave (leitura de pulsos de entrada)
  slaveMode: "client", // client = conecta no slave | server = aguarda conexão
  slaveIp: "192.168.5.254",
  slavePort: 504,
  slaveTimeout: 5000,

  // Modbus CLP (escrita de comandos)
  clpMode: "server", // client = conecta no CLP | server = aguarda conexão do CLP
  clpIp: "192.168.5.25",
  clpPort: 504,
  clpTimeout: 5000,

  // Endereço inicial dos tempos de motor (Holding Registers)
  motorTimesStartAddress: 1,

  // Configurações da esteira
  conveyorLength: 15, // 15 metros
  conveyorSpeed: 0.5, // m/s (ajustável)

  // Configurações das 6 saídas laterais
  outputs: [
    {
      id: 1,
      name: "Saída 1",
      delayTime: 4, // 4 segundos
      toleranceTime: 1, // 1 segundo de tolerância
      pulseDuration: 500, // 500ms de pulso
      activeEngineDuration: 20, //  (2s) de motor ativo no clp
      motorTimeHRAddress: 1, // Holding Register address
      inputAddress: 1, // Coil 1 - recebe pulsos
      outputAddress: 6, // Coil 6 - envia pulsos ao CLP
      enabled: true,
    },
    {
      id: 2,
      name: "Saída 2",
      delayTime: 8, // 8 segundos
      toleranceTime: 1,
      pulseDuration: 500,
      activeEngineDuration: 20,
      motorTimeHRAddress: 2,
      inputAddress: 2,
      outputAddress: 7,
      enabled: true,
    },
    {
      id: 3,
      name: "Saída 3",
      delayTime: 12, // 12 segundos
      toleranceTime: 1,
      pulseDuration: 500,
      activeEngineDuration: 20,
      motorTimeHRAddress: 3,
      inputAddress: 3,
      outputAddress: 8,
      enabled: true,
    },
    {
      id: 4,
      name: "Saída 4",
      delayTime: 16, // 16 segundos
      toleranceTime: 1,
      pulseDuration: 500,
      activeEngineDuration: 20,
      motorTimeHRAddress: 4,
      inputAddress: 4,
      outputAddress: 9,
      enabled: true,
    },
    {
      id: 5,
      name: "Saída 5",
      delayTime: 20, // 20 segundos
      toleranceTime: 1,
      pulseDuration: 500,
      activeEngineDuration: 20,
      motorTimeHRAddress: 5,
      inputAddress: 5,
      outputAddress: 10,
      enabled: true,
    },
    {
      id: 6,
      name: "Saída 6",
      delayTime: 24, // 24 segundos
      toleranceTime: 1,
      pulseDuration: 500,
      activeEngineDuration: 20,
      motorTimeHRAddress: 6,
      inputAddress: 6,
      outputAddress: 11,
      enabled: true,
    },
  ],

  // Sensores de entrada (pulsos Modbus)
  inputSensors: [
    { address: 1, productType: 1, lastPulse: 0, pulseDuration: 100 },
    { address: 2, productType: 2, lastPulse: 0, pulseDuration: 100 },
    { address: 3, productType: 3, lastPulse: 0, pulseDuration: 100 },
    { address: 4, productType: 4, lastPulse: 0, pulseDuration: 100 },
    { address: 5, productType: 5, lastPulse: 0, pulseDuration: 100 },
    { address: 6, productType: 6, lastPulse: 0, pulseDuration: 100 },
  ],

  // Ciclo de leitura
  readCycleMs: 100, // 100ms (10 leituras por segundo)

  // Modo Fachina (limpeza)
  cleaningModeCoil: 20, // Coil 20 para modo fachina

  // Sistema ativo
  systemActive: false,
};
