// ============================================
// API ROUTE - CONTROLE DO SISTEMA (START/STOP)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getController } from "../../controller-instance";

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

    const controller = getController();

    if (action === "start") {
      const started = await controller.start();

      if (started) {
        return NextResponse.json({
          success: true,
          message: "Sistema iniciado com sucesso",
          state: controller.getState(),
        });
      } else {
        return NextResponse.json(
          { error: "Falha ao iniciar o sistema" },
          { status: 500 },
        );
      }
    }

    if (action === "stop") {
      await controller.stop();

      return NextResponse.json({
        success: true,
        message: "Sistema parado com sucesso",
      });
    }

    // Modo de limpeza
    if (action === "cleaning") {
      const { active } = body;
      const success = await controller.setCleaningMode(active);

      return NextResponse.json({
        success,
        message: `Modo higienização ${active ? "ativado" : "desativado"}`,
      });
    }

    // Controle manual de válvula
    if (action === "valve-manual") {
      const { outputId, active } = body;
      const success = await controller.setValveManual(outputId, active);

      return NextResponse.json({
        success,
        message: `Válvula ${outputId} ${active ? "ativada" : "desativada"} manualmente`,
      });
    }

    // Modo manual de saída
    if (action === "output-mode") {
      const { outputId, mode } = body;
      const success = await controller.setOutputManualMode(outputId, mode);

      return NextResponse.json({
        success,
        message: `Saída ${outputId} configurada para modo ${mode}`,
      });
    }

    // Reset de contadores
    if (action === "reset-counters") {
      controller.resetCounters();

      return NextResponse.json({
        success: true,
        message: "Contadores resetados",
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.error("[API Control] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
