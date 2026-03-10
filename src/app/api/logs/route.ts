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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");

    if (source === "file") {
      if (!date) {
        // Retorna lista de datas disponíveis
        const availableDates = systemLogger.getAvailableDates();
        return NextResponse.json({
          success: true,
          dates: availableDates,
        });
      }

      // Lê logs de um arquivo específico (usa timezone local)
      const [year, month, day] = date.split("-").map(Number);
      // Cria data em UTC e ajusta para local para evitar problemas de timezone
      const targetDate = new Date(year, month - 1, day, 12, 0, 0); // Meio-dia para evitar problemas de timezone
      const allLogs = systemLogger.readLogsFromFile(targetDate);
      
      // Ordena do mais recente para o mais antigo
      allLogs.sort((a, b) => b.timestamp - a.timestamp);

      // Paginação
      const total = allLogs.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const logs = allLogs.slice(startIndex, endIndex);

      return NextResponse.json({
        success: true,
        date,
        count: logs.length,
        total,
        page,
        limit,
        totalPages,
        logs,
      });
    } else {
      // Retorna logs em memória (paginados)
      const allLogs = systemLogger.getLogs();
      
      // Ordena do mais recente para o mais antigo
      allLogs.sort((a, b) => b.timestamp - a.timestamp);

      // Paginação
      const total = allLogs.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const logs = allLogs.slice(startIndex, endIndex);

      return NextResponse.json({
        success: true,
        source: "memory",
        count: logs.length,
        total,
        page,
        limit,
        totalPages,
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
