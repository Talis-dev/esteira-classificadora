// ============================================
// API ROUTE - MODO LIMPEZA (HIGIENIZAÇÃO)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getController } from "../../controller-instance";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { active } = body;

    const controller = getController();

    if (!controller.isRunning()) {
      return NextResponse.json(
        { error: "Sistema não está em execução" },
        { status: 400 },
      );
    }

    const success = await controller.setCleaningMode(active);

    return NextResponse.json({
      success,
      cleaningMode: active,
      message: active
        ? "Modo higienização ATIVADO"
        : "Modo higienização DESATIVADO",
    });
  } catch (error: any) {
    console.error("[API Cleaning Mode] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const controller = getController();

    if (!controller.isRunning()) {
      return NextResponse.json({
        cleaningMode: false,
        available: false,
      });
    }

    const state = controller.getState();

    return NextResponse.json({
      cleaningMode: state.cleaningMode,
      available: true,
    });
  } catch (error: any) {
    console.error("[API Cleaning Mode] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
