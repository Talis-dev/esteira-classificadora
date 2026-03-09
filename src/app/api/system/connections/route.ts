// ============================================
// API DE INFORMAÇÕES DE CONEXÃO
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { connectionTracker } from "@/lib/connection-tracker";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    server: connectionTracker.getServerInfo(),
    connections: connectionTracker.getConnections(),
    total: connectionTracker.getConnectionCount(),
  });
}
