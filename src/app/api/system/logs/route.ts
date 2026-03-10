// ============================================
// API DE LOGS DO SISTEMA
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { systemLogger } from "@/lib/system-logger";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const count = parseInt(url.searchParams.get("count") || "100");

  return NextResponse.json({
    logs: systemLogger.getRecentLogs(count),
    total: systemLogger.getLogs().length,
  });
}

export async function DELETE(request: NextRequest) {
  systemLogger.clearLogs();
  return NextResponse.json({ success: true, message: "Logs limpos" });
}
