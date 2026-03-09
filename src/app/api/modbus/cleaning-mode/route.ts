// ============================================
// API ROUTE - MODO FACHINA (LIMPEZA)
// ============================================

import { NextResponse } from "next/server";
import { getController } from "../../controller-instance";

export async function POST() {
  try {
    const controller = getController();

    if (!controller) {
      return NextResponse.json(
        { error: "Sistema não está em execução" },
        { status: 400 },
      );
    }

    const newState = controller.toggleCleaningMode();

    return NextResponse.json({
      success: true,
      cleaningMode: newState,
      message: newState
        ? "Modo fachina ATIVADO - Módulos levantados e roletes ativos"
        : "Modo fachina DESATIVADO",
    });
  } catch (error: any) {
    console.error("[API Cleaning Mode] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const controller = getController();

    if (!controller) {
      return NextResponse.json({
        cleaningMode: false,
        available: false,
      });
    }

    return NextResponse.json({
      cleaningMode: controller.isCleaningMode(),
      available: true,
    });
  } catch (error: any) {
    console.error("[API Cleaning Mode] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
