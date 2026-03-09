// ============================================
// API ROUTE - SINCRONIZAÇÃO DE ESTADO
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getController } from "../../controller-instance";
import { updateMainServerState } from "@/lib/server-state";

/**
 * Endpoint para sincronizar o estado persistente com o estado real do servidor
 * APENAS ATUALIZA O ARQUIVO - NUNCA PARA OU INICIA O SISTEMA
 */
export async function POST(request: NextRequest) {
  try {
    const controller = getController();
    const isActuallyRunning = controller !== null;

    console.log(
      "[API Sync] Sincronizando - controlador existe:",
      isActuallyRunning,
    );

    if (isActuallyRunning && controller) {
      const state = controller.getSystemState();
      const isConnected = state.connected;

      // Atualizar estado persistente com a realidade
      // Sistema está rodando se controlador existe
      updateMainServerState(true, Date.now());

      console.log(
        "[API Sync] Atualizado para: running=true, connected=",
        isConnected,
      );

      return NextResponse.json({
        success: true,
        synchronized: true,
        running: true,
        connected: isConnected,
        message: `Estado sincronizado: rodando (${isConnected ? "conectado" : "conectando"})`,
      });
    } else {
      // Controlador não existe, atualizar estado para parado
      updateMainServerState(false, 0);

      console.log("[API Sync] Atualizado para: running=false");

      return NextResponse.json({
        success: true,
        synchronized: true,
        running: false,
        message: "Estado sincronizado: parado",
      });
    }
  } catch (error: any) {
    console.error("[API Sync State] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
