// ============================================
// API DE ALERTAS CRÍTICOS
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { criticalAlerts } from "@/lib/critical-alerts";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const unacknowledgedOnly = url.searchParams.get("unacknowledged") === "true";

  return NextResponse.json({
    alerts: unacknowledgedOnly
      ? criticalAlerts.getUnacknowledgedAlerts()
      : criticalAlerts.getAllAlerts(),
    unacknowledgedCount: criticalAlerts.getUnacknowledgedCount(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId } = body;

    if (action === "acknowledge") {
      if (alertId) {
        criticalAlerts.acknowledgeAlert(alertId);
      } else {
        criticalAlerts.acknowledgeAll();
      }
      return NextResponse.json({ success: true });
    }

    if (action === "clear") {
      criticalAlerts.clearAcknowledged();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
