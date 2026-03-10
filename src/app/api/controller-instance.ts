// ============================================
// RE-EXPORTAÇÃO DO SINGLETON DO CONTROLADOR
// Mantém compatibilidade com código existente
// ============================================

import { conveyorController } from "@/lib/conveyor-controller";

/**
 * Retorna a instância do controlador
 */
export function getController() {
  return conveyorController;
}

/**
 * Mantém compatibilidade com código legado que espera inicialização explícita
 */
export function initializeController() {
  return conveyorController;
}
