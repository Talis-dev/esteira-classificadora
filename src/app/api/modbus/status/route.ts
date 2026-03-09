// ============================================
// API ROUTE - STATUS DO SISTEMA
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getController } from "../../controller-instance";
import { getMainServerState } from "@/lib/server-state";
import "../../auto-restore"; // Importa para garantir que auto-restore seja executado

export async function GET(request: NextRequest) {
  try {
    const controller = getController();
    const savedState = getMainServerState();

    // Se controlador existe, está rodando
    const isRunning = controller !== null;

    console.log("[API Status] Verificação:", {
      hasController: isRunning,
      savedStateRunning: savedState.running,
    });

    if (!controller) {
      return NextResponse.json({
        success: true,
        running: false,
        connected: false,
        savedState: savedState,
        message: "Sistema não iniciado",
      });
    }

    const state = controller.getSystemState();
    const queueManager = controller.getQueueManager();
    const stats = queueManager.getStats();
    const logs = queueManager.getLogs(50);

    console.log("[API Status] Sistema rodando - connected:", state.connected);

    return NextResponse.json({
      success: true,
      running: true,
      connected: state.connected,
      state,
      stats,
      logs,
      savedState,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("[API Status] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        running: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
