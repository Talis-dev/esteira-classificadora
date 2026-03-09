// ============================================
// API DE TESTE DO CLP
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { ModbusServer } from "@/lib/modbus-server";
import { ModbusClient } from "@/lib/modbus-client";
import { updateTestServerState, getTestServerState } from "@/lib/server-state";

let testServer: ModbusServer | null = null;
let testClient: ModbusClient | null = null;
let testMode: "server" | "client" = "server";
let testStartTime: number = 0;
let testHistory: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, port, mode, host, coilAddress, value } = body;

    // Iniciar teste (server ou client)
    if (action === "start") {
      const testMode = mode || "server";

      // Verificar estado persistente
      const savedState = getTestServerState();
      if (testServer || testClient || savedState.running) {
        return NextResponse.json(
          { error: "Teste já está rodando" },
          { status: 400 },
        );
      }

      if (testMode === "server") {
        // Modo Server: Criar servidor e aguardar CLP conectar
        testServer = new ModbusServer(port || 502);
        await testServer.start();
        testStartTime = Date.now();
        testHistory = [];

        // Salvar estado
        updateTestServerState(true, port || 502, testStartTime);

        testHistory.push({
          timestamp: Date.now(),
          action: "start",
          mode: "server",
          message: `Servidor de teste iniciado na porta ${port || 502}`,
        });

        return NextResponse.json({
          success: true,
          mode: "server",
          message: "Servidor de teste iniciado",
          port: port || 502,
        });
      } else {
        // Modo Client: Conectar ao CLP
        const clpHost = host || "192.168.3.115";
        const clpPort = port || 502;

        testClient = new ModbusClient(clpHost, clpPort, 5000);
        const connected = await testClient.connect();

        if (!connected) {
          testClient = null;
          return NextResponse.json(
            { error: `Falha ao conectar em ${clpHost}:${clpPort}` },
            { status: 500 },
          );
        }

        testStartTime = Date.now();
        testHistory = [];

        testHistory.push({
          timestamp: Date.now(),
          action: "start",
          mode: "client",
          message: `Cliente conectado a ${clpHost}:${clpPort}`,
        });

        return NextResponse.json({
          success: true,
          mode: "client",
          message: `Conectado a ${clpHost}:${clpPort}`,
          host: clpHost,
          port: clpPort,
        });
      }
    }

    // Parar teste
    if (action === "stop") {
      if (!testServer && !testClient) {
        return NextResponse.json(
          { error: "Teste não está rodando" },
          { status: 400 },
        );
      }

      const uptime = Date.now() - testStartTime;

      if (testServer) {
        await testServer.stop();
        testHistory.push({
          timestamp: Date.now(),
          action: "stop",
          mode: "server",
          message: `Servidor parado após ${(uptime / 1000).toFixed(1)}s`,
        });
        testServer = null;
      }

      if (testClient) {
        testClient.disconnect();
        testHistory.push({
          timestamp: Date.now(),
          action: "stop",
          mode: "client",
          message: `Cliente desconectado após ${(uptime / 1000).toFixed(1)}s`,
        });
        testClient = null;
      }

      testStartTime = 0;

      // Atualizar estado
      updateTestServerState(false, 502, 0);

      return NextResponse.json({
        success: true,
        message: "Teste parado",
        uptime,
      });
    }

    // Enviar pulso em um coil
    if (action === "pulse") {
      const address = parseInt(coilAddress);
      const duration = parseInt(value) || 1000;

      if (testServer) {
        // Modo Server: escrever no servidor local
        testServer.writeCoil(address, true);

        testHistory.push({
          timestamp: Date.now(),
          action: "pulse_start",
          mode: "server",
          coil: address,
          duration,
          message: `Pulso iniciado no coil ${address} por ${duration}ms`,
        });

        setTimeout(() => {
          if (testServer) {
            testServer.writeCoil(address, false);
            testHistory.push({
              timestamp: Date.now(),
              action: "pulse_end",
              mode: "server",
              coil: address,
              message: `Pulso finalizado no coil ${address}`,
            });
          }
        }, duration);

        return NextResponse.json({
          success: true,
          mode: "server",
          message: `Pulso de ${duration}ms enviado para coil ${address}`,
          coil: address,
          duration,
          hasClients: testServer.hasClients(),
        });
      } else if (testClient) {
        // Modo Client: escrever no CLP remoto
        await testClient.writeSingleCoil(address, true);

        testHistory.push({
          timestamp: Date.now(),
          action: "pulse_start",
          mode: "client",
          coil: address,
          duration,
          message: `Pulso enviado ao CLP - coil ${address} por ${duration}ms`,
        });

        setTimeout(async () => {
          if (testClient && testClient.isConnected()) {
            await testClient.writeSingleCoil(address, false);
            testHistory.push({
              timestamp: Date.now(),
              action: "pulse_end",
              mode: "client",
              coil: address,
              message: `Pulso finalizado no CLP - coil ${address}`,
            });
          }
        }, duration);

        return NextResponse.json({
          success: true,
          mode: "client",
          message: `Pulso de ${duration}ms enviado ao CLP - coil ${address}`,
          coil: address,
          duration,
        });
      } else {
        return NextResponse.json(
          { error: "Teste não está rodando" },
          { status: 400 },
        );
      }
    }

    // Definir coil (ligar/desligar)
    if (action === "set") {
      const address = parseInt(coilAddress);
      const state = value === true || value === "true";

      if (testServer) {
        // Modo Server
        testServer.writeCoil(address, state);

        testHistory.push({
          timestamp: Date.now(),
          action: "set",
          mode: "server",
          coil: address,
          value: state,
          message: `Coil ${address} definido para ${state ? "ON" : "OFF"}`,
        });

        return NextResponse.json({
          success: true,
          mode: "server",
          message: `Coil ${address} definido para ${state ? "ON" : "OFF"}`,
          coil: address,
          value: state,
          hasClients: testServer.hasClients(),
        });
      } else if (testClient) {
        // Modo Client
        await testClient.writeSingleCoil(address, state);

        testHistory.push({
          timestamp: Date.now(),
          action: "set",
          mode: "client",
          coil: address,
          value: state,
          message: `Coil ${address} no CLP definido para ${state ? "ON" : "OFF"}`,
        });

        return NextResponse.json({
          success: true,
          mode: "client",
          message: `Coil ${address} no CLP definido para ${state ? "ON" : "OFF"}`,
          coil: address,
          value: state,
        });
      } else {
        return NextResponse.json(
          { error: "Teste não está rodando" },
          { status: 400 },
        );
      }
    }

    // Ler coils (apenas para modo client)
    if (action === "read") {
      if (!testClient) {
        return NextResponse.json(
          { error: "Modo client não está ativo" },
          { status: 400 },
        );
      }

      const address = parseInt(coilAddress);
      const quantity = parseInt(value) || 10;

      const result = await testClient.readCoils(address, quantity);

      testHistory.push({
        timestamp: Date.now(),
        action: "read",
        mode: "client",
        coil: address,
        quantity,
        message: `Lidos ${quantity} coils do CLP a partir do endereço ${address}`,
      });

      return NextResponse.json({
        success: result.success,
        mode: "client",
        message: result.success
          ? `Coils lidos do CLP`
          : `Erro: ${result.error}`,
        coil: address,
        quantity,
        values: result.coils || [],
      });
    }

    // Ler Holding Registers
    if (action === "readHR") {
      const addresses = body.addresses as number[];

      if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
        return NextResponse.json(
          { error: "Endereços de HR inválidos" },
          { status: 400 },
        );
      }

      if (testServer) {
        // Modo Server: Ler dos próprios buffers
        const values = addresses.map((addr) => ({
          address: addr,
          value: testServer?.readRegister(addr),
        }));

        testHistory.push({
          timestamp: Date.now(),
          action: "readHR",
          mode: "server",
          message: `Lidos ${addresses.length} HRs: ${addresses.join(", ")}`,
          data: values,
        });

        return NextResponse.json({
          success: true,
          mode: "server",
          message: `HRs lidos do buffer local`,
          values,
        });
      } else if (testClient) {
        // Modo Client: Ler do CLP remoto
        const values: { address: number; value: number }[] = [];
        let hasError = false;
        let errorMsg = "";

        for (const addr of addresses) {
          const result = await testClient.readHoldingRegisters(addr, 1);
          if (result.success && result.registers) {
            values.push({
              address: addr,
              value: result.registers[0],
            });
          } else {
            hasError = true;
            errorMsg = result.error || "Erro desconhecido";
            break;
          }
        }

        if (hasError) {
          return NextResponse.json(
            { error: `Erro ao ler HRs: ${errorMsg}` },
            { status: 500 },
          );
        }

        testHistory.push({
          timestamp: Date.now(),
          action: "readHR",
          mode: "client",
          message: `Lidos ${addresses.length} HRs do CLP: ${addresses.join(", ")}`,
          data: values,
        });

        return NextResponse.json({
          success: true,
          mode: "client",
          message: `HRs lidos do CLP`,
          values,
        });
      } else {
        return NextResponse.json(
          { error: "Teste não está rodando" },
          { status: 400 },
        );
      }
    }

    // Escrever Holding Register
    if (action === "writeHR") {
      const address = parseInt(body.address);
      const value = parseInt(body.value);

      if (isNaN(address) || isNaN(value) || value < 0 || value > 65535) {
        return NextResponse.json(
          { error: "Endereço ou valor inválido (0-65535)" },
          { status: 400 },
        );
      }

      if (testServer) {
        // Modo Server: Escrever no buffer local
        testServer.writeRegister(address, value);

        testHistory.push({
          timestamp: Date.now(),
          action: "writeHR",
          mode: "server",
          message: `HR ${address} definido para ${value}`,
          address,
          value,
        });

        return NextResponse.json({
          success: true,
          mode: "server",
          message: `HR ${address} definido para ${value}`,
          address,
          value,
        });
      } else if (testClient) {
        // Modo Client: Escrever no CLP remoto
        const success = await testClient.writeSingleRegister(address, value);

        if (!success) {
          return NextResponse.json(
            { error: "Falha ao escrever no CLP" },
            { status: 500 },
          );
        }

        testHistory.push({
          timestamp: Date.now(),
          action: "writeHR",
          mode: "client",
          message: `HR ${address} no CLP definido para ${value}`,
          address,
          value,
        });

        return NextResponse.json({
          success: true,
          mode: "client",
          message: `HR ${address} no CLP definido para ${value}`,
          address,
          value,
        });
      } else {
        return NextResponse.json(
          { error: "Teste não está rodando" },
          { status: 400 },
        );
      }
    }

    // Obter status
    if (action === "status") {
      const currentMode = testServer ? "server" : testClient ? "client" : null;

      return NextResponse.json({
        running: testServer !== null || testClient !== null,
        mode: currentMode,
        uptime: testServer || testClient ? Date.now() - testStartTime : 0,
        hasClients: testServer ? testServer.hasClients() : false,
        connected: testClient ? testClient.isConnected() : false,
        history: testHistory.slice(-50), // Últimos 50 eventos
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    console.error("[API Test CLP] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Verificar estado real
  const savedState = getTestServerState();
  const actuallyRunning = testServer !== null || testClient !== null;
  const currentMode = testServer ? "server" : testClient ? "client" : null;

  // Se o estado salvo diz que está rodando mas não está, corrigir
  if (savedState.running && !actuallyRunning) {
    updateTestServerState(false, 502, 0);
  }

  // Se está rodando mas startTime é 0, usar o salvo
  const startTime = testStartTime || savedState.startTime;

  return NextResponse.json({
    running: actuallyRunning,
    mode: currentMode,
    uptime: actuallyRunning ? Date.now() - startTime : 0,
    hasClients: testServer ? testServer.hasClients() : false,
    connected: testClient ? testClient.isConnected() : false,
    history: testHistory.slice(-50),
    savedState: savedState,
  });
}
