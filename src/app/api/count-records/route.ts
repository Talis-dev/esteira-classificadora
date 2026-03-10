// ============================================
// API ROUTE - REGISTROS DE CONTAGEM
// ============================================

import { NextResponse } from "next/server";
import countLogger from "@/lib/count-logger";

export async function GET() {
  try {
    const records = countLogger.getRecords();

    return NextResponse.json({
      success: true,
      records,
      count: records.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    countLogger.clear();

    return NextResponse.json({
      success: true,
      message: "Registros limpos com sucesso",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
