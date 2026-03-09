// ============================================
// GERENCIADOR DE CONFIGURAÇÃO DA ESTEIRA CLASSIFICADORA
// ============================================

import fs from "fs";
import path from "path";
import {
  ConveyorSystemConfig,
  DEFAULT_CONVEYOR_CONFIG,
} from "@/types/conveyor";

const CONFIG_FILE = path.join(process.cwd(), "data", "conveyor-config.json");

/**
 * Carrega a configuração do sistema
 */
export function loadConveyorConfig(): ConveyorSystemConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      const config = JSON.parse(data);

      // Mescla com config padrão para garantir que novos campos existam
      return {
        ...DEFAULT_CONVEYOR_CONFIG,
        ...config,
        inputs: {
          ...DEFAULT_CONVEYOR_CONFIG.inputs,
          ...config.inputs,
        },
        outputs: {
          ...DEFAULT_CONVEYOR_CONFIG.outputs,
          ...config.outputs,
        },
        conveyorOutputs:
          config.conveyorOutputs || DEFAULT_CONVEYOR_CONFIG.conveyorOutputs,
      };
    }
  } catch (error) {
    console.error("Erro ao carregar configuração da esteira:", error);
  }

  // Retorna configuração padrão se não existir arquivo
  return { ...DEFAULT_CONVEYOR_CONFIG };
}

/**
 * Salva a configuração do sistema
 */
export function saveConveyorConfig(config: ConveyorSystemConfig): boolean {
  try {
    // Garante que o diretório existe
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Erro ao salvar configuração da esteira:", error);
    return false;
  }
}

/**
 * Reseta a configuração para os valores padrão
 */
export function resetConveyorConfig(): ConveyorSystemConfig {
  const defaultConfig = { ...DEFAULT_CONVEYOR_CONFIG };
  saveConveyorConfig(defaultConfig);
  return defaultConfig;
}

// Singleton global para cache de configuração
declare global {
  var conveyorConfigCache: ConveyorSystemConfig | undefined;
}

/**
 * Obtém configuração em cache (para evitar múltiplas leituras de arquivo)
 */
export function getCachedConveyorConfig(): ConveyorSystemConfig {
  if (!global.conveyorConfigCache) {
    global.conveyorConfigCache = loadConveyorConfig();
  }
  return global.conveyorConfigCache;
}

/**
 * Atualiza cache e salva configuração
 */
export function updateConveyorConfig(
  config: Partial<ConveyorSystemConfig>,
): ConveyorSystemConfig {
  const currentConfig = getCachedConveyorConfig();
  const newConfig = {
    ...currentConfig,
    ...config,
  };

  if (saveConveyorConfig(newConfig)) {
    global.conveyorConfigCache = newConfig;
    return newConfig;
  }

  return currentConfig;
}

/**
 * Invalida cache (forçar reload na próxima leitura)
 */
export function invalidateConveyorConfigCache() {
  global.conveyorConfigCache = undefined;
}
