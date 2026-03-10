// ============================================
// API ROUTE - CONFIGURAÇÃO DO SISTEMA
// ============================================

import { NextRequest, NextResponse } from "next/server";
import {
  getCachedConveyorConfig,
  updateConveyorConfig,
  saveConveyorConfig,
  loadConveyorConfig,
} from "@/lib/conveyor-config-manager";
import { getController } from "../controller-instance";

/**
 * GET - Retorna configuração atual
 */
export async function GET() {
  try {
    const config = getCachedConveyorConfig();

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error("[API Config] Erro ao carregar config:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST - Atualiza configuração
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!updates) {
      return NextResponse.json(
        { error: "Atualizações não especificadas" },
        { status: 400 },
      );
    }

    // Atualiza e salva a configuração
    const updatedConfig = updateConveyorConfig(updates);
    
    // Força reload do cache na próxima leitura
    console.log("[API Config] Configuração salva:", {
      distributionMode: updatedConfig.distributionMode,
      targets: updatedConfig.conveyorOutputs.map(o => `${o.id}:${o.targetPerMinute}`)
    });

    // Se sistema está rodando, aplica modos manuais imediatamente
    const controller = getController();
    if (controller) {
      await controller.applyManualModes();
    }

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      message: "Configuração atualizada com sucesso",
    });
  } catch (error: any) {
    console.error("[API Config] Erro ao atualizar config:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
