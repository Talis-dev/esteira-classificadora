// ============================================
// INSTÂNCIA SINGLETON DO CONTROLADOR
// ============================================

import { ConveyorController } from "@/lib/conveyor-controller";
import { loadConfig } from "@/lib/config-manager";
import { updateMainServerState } from "@/lib/server-state";

/**
 * Singleton verdadeiro - usa global do Node.js para persistir entre hot-reloads
 * NUNCA é destruída automaticamente por navegação de páginas ou hot-reload
 */

// Usar global do Node.js para persistir entre recargas de módulo
declare global {
  var __modbusController: ConveyorController | undefined;
}

/**
 * Retorna a instância atual do controlador (pode ser null se parado)
 * APENAS CONSULTA - nunca cria ou destrói automaticamente
 */
export function getController(): ConveyorController | null {
  return global.__modbusController || null;
}

export function initializeController(): ConveyorController {
  if (!global.__modbusController) {
    const config = loadConfig();
    global.__modbusController = new ConveyorController(config);
    // Salvar estado como rodando
    updateMainServerState(true, Date.now());
    console.log("[Controller] Nova instância criada e salva em global");
  }
  return global.__modbusController;
}

export function destroyController(): void {
  if (global.__modbusController) {
    global.__modbusController.stop();
    global.__modbusController = undefined;
    // Atualizar estado como parado
    updateMainServerState(false, 0);
    console.log("[Controller] Instância destruída");
  }
}
