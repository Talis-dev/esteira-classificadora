// ============================================
// GERENCIADOR DE CONFIGURAÇÕES PERSISTENTE
// ============================================

import fs from "fs";
import path from "path";
import { SystemConfig } from "@/types";
import { defaultConfig } from "@/lib/default-config";

const CONFIG_FILE_PATH = path.join(process.cwd(), "data", "system-config.json");

/**
 * Garante que o diretório de dados existe
 */
function ensureDataDirectory(): void {
  const dataDir = path.dirname(CONFIG_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Carrega a configuração do arquivo
 */
export function loadConfig(): SystemConfig {
  try {
    ensureDataDirectory();

    if (!fs.existsSync(CONFIG_FILE_PATH)) {
      // Se não existe, cria com configuração padrão
      saveConfig(defaultConfig);
      return defaultConfig;
    }

    const fileContent = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
    const config = JSON.parse(fileContent) as SystemConfig;

    console.log("[Config] Configuração carregada do arquivo");
    return config;
  } catch (error) {
    console.error(
      "[Config] Erro ao carregar configuração, usando padrão:",
      error,
    );
    return defaultConfig;
  }
}

/**
 * Salva a configuração no arquivo
 */
export function saveConfig(config: SystemConfig): boolean {
  try {
    ensureDataDirectory();

    const fileContent = JSON.stringify(config, null, 2);
    fs.writeFileSync(CONFIG_FILE_PATH, fileContent, "utf-8");

    console.log("[Config] Configuração salva no arquivo");
    return true;
  } catch (error) {
    console.error("[Config] Erro ao salvar configuração:", error);
    return false;
  }
}

/**
 * Reseta para configuração padrão
 */
export function resetConfig(): SystemConfig {
  saveConfig(defaultConfig);
  return defaultConfig;
}

/**
 * Atualiza configuração parcialmente
 */
export function updateConfig(updates: Partial<SystemConfig>): SystemConfig {
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...updates };
  saveConfig(newConfig);
  return newConfig;
}
