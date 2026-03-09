// ============================================
// AUTO-RESTORE DO CONTROLADOR
// ============================================

import { getController, initializeController } from "./controller-instance";
import { getMainServerState } from "@/lib/server-state";

/**
 * Verifica se o sistema deveria estar rodando e reconecta automaticamente
 * Chamado quando o servidor Next.js reinicia
 *
 * DESABILITADO: Estava causando reconexões automáticas indesejadas
 */
export async function autoRestoreController() {
  // DESABILITADO - não reconectar automaticamente
  // O usuário deve iniciar manualmente via dashboard
  /*
  const savedState = getMainServerState();
  const controller = getController();

  // Se estado salvo indica que deveria estar rodando mas não está
  if (savedState.running && !controller) {
    console.log(
      "[AutoRestore] Estado salvo indica sistema rodando, recriando controlador...",
    );

    try {
      const newController = initializeController();
      const started = await newController.start();

      if (started) {
        console.log("[AutoRestore] Controlador restaurado com sucesso");
      } else {
        console.log("[AutoRestore] Falha ao restaurar controlador");
      }
    } catch (error) {
      console.error("[AutoRestore] Erro ao restaurar:", error);
    }
  }
  */
}

// NÃO executar automaticamente - deixar usuário controlar
// autoRestoreController();
