// ============================================
// API ROUTE - CONFIGURAÇÃO DO SISTEMA
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getController } from "../controller-instance";
import { loadConfig, saveConfig, resetConfig } from "@/lib/config-manager";
import { SystemConfig } from "@/types";

// GET - Obter configuração atual
export async function GET(request: NextRequest) {
  try {
    const config = loadConfig();
    
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error("[API Config GET] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Atualizar configuração
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: "Configuração não fornecida" },
        { status: 400 },
      );
    }

    // Valida configuração básica
    if (!config.slaveIp || !config.clpIp) {
      return NextResponse.json(
        { error: "IPs do Slave e CLP são obrigatórios" },
        { status: 400 },
      );
    }

    // Salva configuração no arquivo
    const saved = saveConfig(config);
    
    if (!saved) {
      return NextResponse.json(
        { error: "Erro ao salvar configuração" },
        { status: 500 },
      );
    }

    // Se o controlador está ativo, atualiza a configuração
    const controller = getController();
    if (controller) {
      controller.updateConfig(config);
    }

    return NextResponse.json({
      success: true,
      message: "Configuração salva com sucesso",
      config,
    });
  } catch (error: any) {
    console.error("[API Config POST] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Resetar para configuração padrão
export async function PUT(request: NextRequest) {
  try {
    const config = resetConfig();

    const controller = getController();
    if (controller) {
      controller.updateConfig(config);
    }

    return NextResponse.json({
      success: true,
      message: "Configuração resetada para padrão",
      config,
    });
  } catch (error: any) {
    console.error("[API Config PUT] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
