// ============================================
// API DE LEITURA DE HOLDING REGISTERS DO CLP
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { modbusManager } from "@/lib/modbus-client";
import { loadConfig } from "@/lib/config-manager";
import { getMainServerState } from "@/lib/server-state";
import { getController } from "../../controller-instance";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startAddress, quantity } = body;

    if (
      startAddress === undefined ||
      quantity === undefined ||
      quantity < 1 ||
      quantity > 20
    ) {
      return NextResponse.json(
        { error: "Parâmetros inválidos (startAddress e quantity requeridos)" },
        { status: 400 },
      );
    }

    const serverState = getMainServerState();
    if (!serverState.running) {
      return NextResponse.json(
        { error: "Sistema não está rodando" },
        { status: 400 },
      );
    }

    // Verifica se o controller existe e está conectado usando o estado real
    const controller = getController();
    if (!controller) {
      return NextResponse.json(
        { error: "Sistema não está rodando" },
        { status: 400 },
      );
    }

    const systemState = controller.getSystemState();
    if (!systemState.connected) {
      return NextResponse.json(
        {
          error: "CLP não está conectado. Aguarde a conexão estabilizar.",
          connected: false,
        },
        { status: 503 },
      );
    }

    const config = loadConfig();

    // Verifica modo de conexão
    if (config.clpMode === "client") {
      // Modo Client: Lê do CLP via cliente Modbus do controller
      const clpClient = modbusManager.getCLPClient(
        config.clpIp,
        config.clpPort,
        config.clpTimeout,
      );

      // Lê os registradores usando a conexão existente do controller
      const result = await clpClient.readHoldingRegisters(
        startAddress,
        quantity,
      );

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Erro ao ler HRs do CLP" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        startAddress,
        quantity,
        values: result.registers || [],
        timestamp: Date.now(),
      });
    } else {
      // Modo Server: Lê dos buffers locais
      // Não implementado para modo server ainda
      return NextResponse.json(
        { error: "Leitura de HR não disponível em modo server" },
        { status: 400 },
      );
    }
  } catch (error: any) {
    console.error("[API] Erro ao ler HRs:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 },
    );
  }
}
