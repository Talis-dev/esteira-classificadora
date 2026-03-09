// ============================================
// GERENCIADOR DE ESTADO DO SERVIDOR
// ============================================

import fs from "fs";
import path from "path";

interface ServerState {
  mainServer: {
    running: boolean;
    startTime: number;
  };
  testServer: {
    running: boolean;
    startTime: number;
    port: number;
  };
}

const STATE_FILE_PATH = path.join(process.cwd(), "data", "server-state.json");

const defaultState: ServerState = {
  mainServer: {
    running: false,
    startTime: 0,
  },
  testServer: {
    running: false,
    startTime: 0,
    port: 502,
  },
};

/**
 * Garante que o diretório de dados existe
 */
function ensureDataDirectory(): void {
  const dataDir = path.dirname(STATE_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Carrega o estado do arquivo
 */
export function loadServerState(): ServerState {
  try {
    ensureDataDirectory();

    if (!fs.existsSync(STATE_FILE_PATH)) {
      saveServerState(defaultState);
      return defaultState;
    }

    const fileContent = fs.readFileSync(STATE_FILE_PATH, "utf-8");
    const state = JSON.parse(fileContent) as ServerState;

    return state;
  } catch (error) {
    console.error(
      "[ServerState] Erro ao carregar estado, usando padrão:",
      error,
    );
    return defaultState;
  }
}

/**
 * Salva o estado no arquivo
 */
export function saveServerState(state: ServerState): boolean {
  try {
    ensureDataDirectory();

    const fileContent = JSON.stringify(state, null, 2);
    fs.writeFileSync(STATE_FILE_PATH, fileContent, "utf-8");

    return true;
  } catch (error) {
    console.error("[ServerState] Erro ao salvar estado:", error);
    return false;
  }
}

/**
 * Atualiza o estado do servidor principal
 */
export function updateMainServerState(
  running: boolean,
  startTime?: number,
): void {
  const state = loadServerState();
  state.mainServer.running = running;
  if (startTime !== undefined) {
    state.mainServer.startTime = startTime;
  }
  saveServerState(state);
}

/**
 * Atualiza o estado do servidor de teste
 */
export function updateTestServerState(
  running: boolean,
  port?: number,
  startTime?: number,
): void {
  const state = loadServerState();
  state.testServer.running = running;
  if (port !== undefined) {
    state.testServer.port = port;
  }
  if (startTime !== undefined) {
    state.testServer.startTime = startTime;
  }
  saveServerState(state);
}

/**
 * Obtém o estado do servidor principal
 */
export function getMainServerState() {
  const state = loadServerState();
  return state.mainServer;
}

/**
 * Obtém o estado do servidor de teste
 */
export function getTestServerState() {
  const state = loadServerState();
  return state.testServer;
}

/**
 * Reseta todo o estado
 */
export function resetServerState(): void {
  saveServerState(defaultState);
}
