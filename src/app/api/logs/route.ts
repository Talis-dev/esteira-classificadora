// ============================================
// API DE LEITURA DE LOGS DO SISTEMA
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { systemLogger } from "@/lib/system-logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const source = searchParams.get("source") || "memory"; // memory ou file

    if (source === "file") {
      if (!date) {
        // Retorna lista de datas disponíveis
        const availableDates = systemLogger.getAvailableDates();
        return NextResponse.json({
          success: true,
          dates: availableDates,
        });
      }

      // Lê logs de um arquivo específico
      const [year, month, day] = date.split("-").map(Number);
      const targetDate = new Date(year, month - 1, day);
      const logs = systemLogger.readLogsFromFile(targetDate);

      return NextResponse.json({
        success: true,
        date,
        count: logs.length,
        logs,
      });
    } else {
      // Retorna logs em memória (últimos 1000)
      const logs = systemLogger.getLogs();

      return NextResponse.json({
        success: true,
        source: "memory",
        count: logs.length,
        logs,
      });
    }
  } catch (error: any) {
    console.error("[API] Erro ao buscar logs:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar logs" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const level = searchParams.get("level");

    if (category) {
      // Deleta logs de uma categoria específica
      const deleted = systemLogger.deleteLogsByCategory(category);
      return NextResponse.json({
        success: true,
        message: `${deleted} logs da categoria "${category}" deletados com sucesso`,
        deleted,
      });
    } else if (level) {
      // Deleta logs de um nível específico
      const deleted = systemLogger.deleteLogsByLevel(level);
      return NextResponse.json({
        success: true,
        message: `${deleted} logs do nível "${level}" deletados com sucesso`,
        deleted,
      });
    } else {
      // Limpa todos os logs em memória
      systemLogger.clearLogs();
      return NextResponse.json({
        success: true,
        message: "Logs em memória limpos com sucesso",
      });
    }
  } catch (error: any) {
    console.error("[API] Erro ao deletar logs:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao deletar logs" },
      { status: 500 },
    );
  }
}
