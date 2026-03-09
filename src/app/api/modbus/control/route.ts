// ============================================
// API ROUTE - CONTROLE DO SISTEMA (START/STOP)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getController, initializeController, destroyController } from "../../controller-instance";
import { updateMainServerState } from "@/lib/server-state";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Ação não especificada" },
        { status: 400 },
      );
    }

    let controller = getController();

    if (action === "start") {
      if (!controller) {
        controller = initializeController();
      }

      const started = await controller.start();

      if (started) {
        // Salvar estado
        updateMainServerState(true, Date.now());

        return NextResponse.json({
          success: true,
          message: "Sistema iniciado com sucesso",
          state: controller.getSystemState(),
        });
      } else {
        return NextResponse.json(
          { error: "Falha ao iniciar o sistema" },
          { status: 500 },
        );
      }
    }

    if (action === "stop") {
      if (!controller) {
        return NextResponse.json(
          { error: "Sistema não está em execução" },
          { status: 400 },
        );
      }

      // IMPORTANTE: Destruir completamente o controller para evitar auto-reconexão
      await destroyController();

      return NextResponse.json({
        success: true,
        message: "Sistema parado com sucesso",
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.error("[API Control] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
