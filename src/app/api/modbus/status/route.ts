// ============================================
// API ROUTE - STATUS DO SISTEMA
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getController } from "../../controller-instance";

export async function GET(request: NextRequest) {
  try {
    const controller = getController();

    const isRunning = controller.isRunning();
    const isConnected = controller.isConnected();

    if (!isRunning) {
      return NextResponse.json({
        success: true,
        running: false,
        connected: false,
        message: "Sistema não iniciado",
      });
    }

    const state = controller.getState();

    return NextResponse.json({
      success: true,
      running: true,
      connected: isConnected,
      state,
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
