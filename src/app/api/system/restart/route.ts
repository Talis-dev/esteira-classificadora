import { NextResponse } from "next/server";

/**
 * POST /api/system/restart
 * Reinicia o servidor Next.js (Windows Task Scheduler)
 */
export async function POST() {
  try {
    console.log("[System] Solicitação de reinicialização recebida...");

    // Em produção no Windows com Agendador de Tarefas:
    // 1. Para o sistema Modbus
    // 2. Mata o processo Node.js
    // 3. O Agendador de Tarefas detecta e reinicia automaticamente

    // Responde primeiro
    const response = NextResponse.json({
      success: true,
      message: "Sistema será reiniciado em 2 segundos...",
    });

    // Agenda o restart após retornar a resposta
    setTimeout(() => {
      console.log("[System] Executando reinicialização...");

      // Força o encerramento do processo
      // O Agendador de Tarefas (configurado com restart) irá reiniciar
      process.exit(0);
    }, 2000);

    return response;
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

/**
 * GET /api/system/restart
 * Retorna o uptime do sistema
 */
export async function GET() {
  try {
    const uptimeSeconds = process.uptime();
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeDays = Math.floor(uptimeHours / 24);

    let uptimeString = "";
    if (uptimeDays > 0) {
      uptimeString += `${uptimeDays}d `;
    }
    if (uptimeHours % 24 > 0) {
      uptimeString += `${uptimeHours % 24}h `;
    }
    if (uptimeMinutes % 60 > 0) {
      uptimeString += `${uptimeMinutes % 60}m `;
    }
    uptimeString += `${Math.floor(uptimeSeconds % 60)}s`;

    return NextResponse.json({
      success: true,
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        minutes: uptimeMinutes,
        hours: uptimeHours,
        days: uptimeDays,
        formatted: uptimeString.trim(),
      },
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
