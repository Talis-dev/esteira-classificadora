// ============================================
// API ROUTE - GERENCIAMENTO DE FILAS
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getController } from "../controller-instance";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, outputId } = body;

    const controller = getController();
    if (!controller) {
      return NextResponse.json(
        { error: "Sistema não está em execução" },
        { status: 400 },
      );
    }

    const queueManager = controller.getQueueManager();

    if (action === "clear") {
      if (outputId) {
        queueManager.clearQueue(outputId);
        return NextResponse.json({
          success: true,
          message: `Fila da saída ${outputId} limpa`,
        });
      } else {
        queueManager.clearAllQueues();
        return NextResponse.json({
          success: true,
          message: "Todas as filas foram limpas",
        });
      }
    }

    if (action === "clearLogs") {
      queueManager.clearLogs();
      return NextResponse.json({
        success: true,
        message: "Logs limpos",
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.error("[API Queue] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
