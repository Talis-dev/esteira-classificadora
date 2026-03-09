"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface SystemLog {
  id: string;
  timestamp: number;
  level: "info" | "warning" | "error" | "success" | "debug";
  category: string;
  message: string;
  data?: any;
}

export default function TestCLPPage() {
  const [serverRunning, setServerRunning] = useState(false);
  const [testMode, setTestMode] = useState<"server" | "client">("server");
  const [currentMode, setCurrentMode] = useState<"server" | "client" | null>(null);
  const [port, setPort] = useState(502);
  const [host, setHost] = useState("192.168.3.115");
  const [serverIp, setServerIp] = useState("0.0.0.0");
  const [uptime, setUptime] = useState(0);
  const [hasClients, setHasClients] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedCoil, setSelectedCoil] = useState(0);
  const [duration, setDuration] = useState(1000);
  const [coilValues, setCoilValues] = useState<boolean[]>([]);
  const [quickAccessMode, setQuickAccessMode] = useState<"pulse" | "toggle">("pulse");
  const [toggledCoils, setToggledCoils] = useState<Set<number>>(new Set());
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logsPaused, setLogsPaused] = useState(true); // Iniciar pausado
  const [mainSystemRunning, setMainSystemRunning] = useState(false);
  
  // Estados para Holding Registers (HR)
  const [enabledHRs, setEnabledHRs] = useState<Set<number>>(new Set([ 1, 2, 3, 4, 5, 6])); // HR 1-6 habilitados por padrão (tempos de motor)
  const [hrValues, setHrValues] = useState<Map<number, number>>(new Map());
  const [editingHR, setEditingHR] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Buscar estado inicial ao carregar a página
    fetchStatus();
    checkMainSystem();
    fetchLogs(); // Buscar logs iniciais

    const interval = setInterval(() => {
      fetchStatus();
      fetchServerInfo();
      checkMainSystem();
      if (!logsPaused) {
        fetchLogs();
      }
    }, 1000);

    // Cleanup: desconectar quando página for desmontada ou recarregada
    return () => {
      clearInterval(interval);
      
      // Se estava rodando, desconectar
      if (serverRunning) {
        fetch("/api/modbus/test-clp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop" }),
        }).catch(() => {
          // Ignora erros ao desconectar durante unmount
        });
      }
    };
  }, [logsPaused]);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/modbus/test-clp");
      const data = await response.json();
      setServerRunning(data.running);
      setCurrentMode(data.mode);
      setUptime(data.uptime || 0);
      setHasClients(data.hasClients || false);
      setConnected(data.connected || false);
      setHistory(data.history || []);

      // Se está rodando e conectado (mode client), desabilitar connecting
      if (data.running && data.mode === "client" && data.connected) {
        setConnecting(false);
      }
      // Se está rodando em mode server, desabilitar connecting
      if (data.running && data.mode === "server") {
        setConnecting(false);
      }
    } catch (error) {
      console.error("Erro ao buscar status:", error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/system/logs?count=50");
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    }
  };

  const fetchServerInfo = async () => {
    try {
      const response = await fetch("/api/system/connections");
      const data = await response.json();
      if (data.server && data.server.ip) {
        setServerIp(data.server.ip);
      }
    } catch (error) {
      console.error("Erro ao buscar info do servidor:", error);
    }
  };

  const checkMainSystem = async () => {
    try {
      const response = await fetch("/api/modbus/status");
      const data = await response.json();
      setMainSystemRunning(data.running === true);
    } catch (error) {
      console.error("Erro ao verificar sistema principal:", error);
    }
  };

  const startServer = async () => {
    setLoading(true);
    setConnecting(true);
    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "start", 
          mode: testMode,
          port,
          host: testMode === "client" ? host : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setServerRunning(true);
        setCurrentMode(data.mode);
        setConnecting(false);
      } else {
        alert(`Erro: ${data.error}`);
        setConnecting(false);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
      setConnecting(false);
    } finally {
      setLoading(false);
    }
  };

  const stopServer = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      const data = await response.json();
      if (data.success) {
        setServerRunning(false);
        setCurrentMode(null);
        setConnecting(false);
        setConnected(false);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const readCoils = async () => {
    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "read",
          coilAddress: selectedCoil,
          value: 10, // Ler 10 coils
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCoilValues(data.values || []);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const sendPulse = async () => {
    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pulse",
          coilAddress: selectedCoil,
          value: duration,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  // Envia pulso direto sem depender do input
  const sendPulseDirect = async (coil: number, pulseDuration: number) => {
    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pulse",
          coilAddress: coil,
          value: pulseDuration,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        console.error(`Erro ao enviar pulso no coil ${coil}: ${data.error}`);
      }
    } catch (error: any) {
      console.error(`Erro ao enviar pulso: ${error.message}`);
    }
  };

  // Faz toggle direto de um coil
  const toggleCoilDirect = async (coil: number) => {
    const isOn = toggledCoils.has(coil);
    const newState = !isOn;

    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          coilAddress: coil,
          value: newState,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setToggledCoils((prev) => {
          const newSet = new Set(prev);
          if (newState) {
            newSet.add(coil);
          } else {
            newSet.delete(coil);
          }
          return newSet;
        });
      } else {
        console.error(`Erro ao fazer toggle no coil ${coil}: ${data.error}`);
      }
    } catch (error: any) {
      console.error(`Erro ao fazer toggle: ${error.message}`);
    }
  };

  // Lê todos os HRs habilitados
  const readHoldingRegisters = async () => {
    if (enabledHRs.size === 0) {
      alert("Nenhum HR habilitado para leitura");
      return;
    }

    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "readHR",
          addresses: Array.from(enabledHRs),
        }),
      });
      const data = await response.json();
      if (data.success && data.values) {
        const newValues = new Map<number, number>();
        data.values.forEach((item: { address: number; value: number }) => {
          newValues.set(item.address, item.value);
        });
        setHrValues(newValues);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  // Escreve valor em um HR
  const writeHoldingRegister = async (address: number, value: number) => {
    try {
      const response = await fetch("/api/modbus/test-clp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "writeHR",
          address,
          value,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setHrValues((prev) => {
          const newMap = new Map(prev);
          newMap.set(address, value);
          return newMap;
        });
        setEditingHR(null);
        setEditValue("");
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  // Toggle de HR habilitado/desabilitado
  const toggleHREnabled = (hr: number) => {
    setEnabledHRs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(hr)) {
        newSet.delete(hr);
      } else {
        newSet.add(hr);
      }
      return newSet;
    });
  };

  const clearLogs = async () => {
    try {
      await fetch("/api/system/logs", { method: "DELETE" });
      setLogs([]);
    } catch (error) {
      console.error("Erro ao limpar logs:", error);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("pt-BR");
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}.${Math.floor((ms % 1000) / 100)}s`;
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      case "success":
        return "text-green-400";
      case "info":
        return "text-blue-400";
      case "debug":
        return "text-gray-400";
      default:
        return "text-gray-300";
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "success":
        return "✅";
      case "info":
        return "ℹ️";
      case "debug":
        return "🔍";
      default:
        return "•";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-light text-gray-300">
            Ferramenta de diagnóstico isolada para testar comunicação Modbus
          </h1>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <span>←</span>
            Voltar
          </Link>
        </div>

        {/* Layout Principal: 2 colunas */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Coluna Esquerda: Controles */}
          <div className="space-y-6">
            {/* Card: Controle do Servidor */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl">🎮</div>
                <h2 className="text-2xl font-semibold">Controle do Servidor</h2>
              </div>

              {/* Status Badges */}
              <div className="flex gap-3 mb-6 flex-wrap">
                <div
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    serverRunning
                      ? "bg-green-500/20 border border-green-500/50"
                      : "bg-gray-500/20 border border-gray-500/50"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${serverRunning ? "bg-green-400" : "bg-gray-400"}`}
                  ></div>
                  <span className="text-sm font-medium">
                    {serverRunning ? "Rodando" : "Parado"}
                  </span>
                </div>

                {serverRunning && currentMode && (
                  <div className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/50 flex items-center gap-2">
                    <span className="text-lg">{currentMode === "server" ? "🖥️" : "🔌"}</span>
                    <span className="text-sm font-medium">
                      Modo: {currentMode === "server" ? "Servidor" : "Cliente"}
                    </span>
                  </div>
                )}

                {serverRunning && (
                  <>
                    <div className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center gap-2">
                      <span className="text-2xl">🎮</span>
                      <span className="text-sm font-medium">
                        {formatUptime(uptime)}
                      </span>
                    </div>

                    {currentMode === "server" && (
                      <div
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                          hasClients
                            ? "bg-green-500/20 border border-green-500/50"
                            : "bg-yellow-500/20 border border-yellow-500/50"
                        }`}
                      >
                        <span className="text-lg">🔌</span>
                        <span className="text-sm font-medium">
                          {hasClients ? "CLP Conectado" : "Aguardando CLP"}
                        </span>
                      </div>
                    )}

                    {currentMode === "client" && (
                      <div
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                          connected
                            ? "bg-green-500/20 border border-green-500/50"
                            : "bg-red-500/20 border border-red-500/50"
                        }`}
                      >
                        <span className="text-lg">🔌</span>
                        <span className="text-sm font-medium">
                          {connected ? "Conectado ao CLP" : "Desconectado"}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Aviso de Conflito */}
              {mainSystemRunning && !serverRunning && (
                <div className="mb-6 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h3 className="text-yellow-400 font-semibold mb-1">
                        Sistema Principal em Execução
                      </h3>
                      <p className="text-sm text-yellow-300">
                        O sistema principal está rodando. Para usar o Teste CLP,
                        pare o sistema principal no Dashboard para evitar
                        conflitos de porta.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Seletor de Modo */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">
                  Modo de Teste
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTestMode("server")}
                    disabled={serverRunning}
                    className={`px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                      testMode === "server"
                        ? "border-green-500 bg-green-500/20 text-green-300"
                        : "border-slate-600 bg-slate-900/50 text-gray-400 hover:border-slate-500"
                    }`}
                  >
                    <div className="text-2xl mb-1">🖥️</div>
                    <div className="font-semibold">Servidor</div>
                    <div className="text-xs opacity-75">Aguardar CLP conectar</div>
                  </button>
                  <button
                    onClick={() => setTestMode("client")}
                    disabled={serverRunning}
                    className={`px-4 py-3 rounded-lg border-2 transition-all disabled:opacity-50 ${
                      testMode === "client"
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-slate-600 bg-slate-900/50 text-gray-400 hover:border-slate-500"
                    }`}
                  >
                    <div className="text-2xl mb-1">🔌</div>
                    <div className="font-semibold">Cliente</div>
                    <div className="text-xs opacity-75">Conectar ao CLP</div>
                  </button>
                </div>
              </div>

              {/* Host (apenas para modo client) */}
              {testMode === "client" && (
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">
                    IP do CLP (Servidor)
                  </label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    disabled={serverRunning}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg font-mono disabled:opacity-50 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    IP do CLP em modo servidor
                  </p>
                </div>
              )}

              {/* Porta Modbus */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">
                  Porta Modbus
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value))}
                  disabled={serverRunning}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white text-lg font-mono disabled:opacity-50 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {testMode === "server" 
                    ? "Porta TCP onde o CLP irá conectar"
                    : "Porta TCP do CLP servidor"}
                </p>
                {serverRunning && testMode === "server" && (
                  <div className="mt-3 bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">
                      Configure no CLP:
                    </p>
                    <p className="text-sm font-mono text-blue-400 font-semibold">
                      IP:{" "}
                      {serverIp === "0.0.0.0" ? "[IP desta máquina]" : serverIp}{" "}
                      | Porta: {port}
                    </p>
                  </div>
                )}
                {serverRunning && testMode === "client" && (
                  <div className="mt-3 bg-green-500/10 border border-green-500/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">
                      Conectado em:
                    </p>
                    <p className="text-sm font-mono text-green-400 font-semibold">
                      {host}:{port}
                    </p>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                {!serverRunning && !connecting ? (
                  <button
                    onClick={startServer}
                    disabled={loading || mainSystemRunning}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-xl">▶</span>
                    {mainSystemRunning
                      ? "Sistema Principal Ativo"
                      : testMode === "server"
                      ? "Iniciar Servidor"
                      : "Conectar ao CLP"}
                  </button>
                ) : connecting ? (
                  <button
                    onClick={stopServer}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 animate-pulse"
                  >
                    <span className="text-xl">⚠️</span>
                    Abortar Conexão
                  </button>
                ) : (
                  <button
                    onClick={stopServer}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-xl">⏹</span>
                    {testMode === "server" ? "Parar Servidor" : "Desconectar"}
                  </button>
                )}
              </div>
            </div>

            {/* Card: Enviar Pulso */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl">📦</div>
                <h2 className="text-2xl font-semibold">Enviar Pulso</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Endereço Coil
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={selectedCoil}
                    onChange={(e) => setSelectedCoil(parseInt(e.target.value))}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Duração (ms)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    step="100"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={sendPulse}
                disabled={!serverRunning}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                📤 Enviar Pulso
              </button>

              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm text-gray-400">Acesso Rápido</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={quickAccessMode === "toggle"}
                      onChange={(e) =>
                        setQuickAccessMode(e.target.checked ? "toggle" : "pulse")
                      }
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-400">
                      Modo Toggle {quickAccessMode === "toggle" && "✓"}
                    </span>
                  </label>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((coil) => {
                    const isToggled = toggledCoils.has(coil);
                    return (
                      <button
                        key={coil}
                        onClick={() => {
                          if (quickAccessMode === "toggle") {
                            toggleCoilDirect(coil);
                          } else {
                            sendPulseDirect(coil, duration);
                          }
                        }}
                        disabled={!serverRunning}
                        className={`${
                          quickAccessMode === "toggle" && isToggled
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-purple-600 hover:bg-purple-700"
                        } disabled:bg-gray-700 disabled:opacity-50 text-white font-mono py-2 rounded transition-colors text-sm`}
                      >
                        {coil}
                      </button>
                    );
                  })}
                </div>
                {quickAccessMode === "pulse" && (
                  <p className="text-xs text-gray-500 mt-2">
                    Clique para enviar pulso de {duration}ms
                  </p>
                )}
                {quickAccessMode === "toggle" && (
                  <>
                    <p className="text-xs text-gray-500 mt-2">
                      Verde = ON | Roxo = OFF | Clique para alternar
                    </p>
                    {toggledCoils.size > 0 && (
                      <button
                        onClick={async () => {
                          // Desligar todos os coils toggleados
                          for (const coil of Array.from(toggledCoils)) {
                            await toggleCoilDirect(coil);
                          }
                        }}
                        disabled={!serverRunning}
                        className="w-full mt-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        🔴 Desligar Todos ({toggledCoils.size})
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Card: Holding Registers (HR) */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🔢</div>
                  <h2 className="text-2xl font-semibold">Holding Registers (HR)</h2>
                </div>
                <button
                  onClick={readHoldingRegisters}
                  disabled={!serverRunning || enabledHRs.size === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  🔄 Ler HRs
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hr) => (
                  <div
                    key={hr}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      enabledHRs.has(hr)
                        ? "bg-slate-900/50 border-blue-500/50"
                        : "bg-slate-900/30 border-slate-600"
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={enabledHRs.has(hr)}
                      onChange={() => toggleHREnabled(hr)}
                      disabled={serverRunning}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                    />

                    {/* Label HR */}
                    <span className="text-sm font-mono text-gray-400 w-16">
                      HR {hr}
                    </span>

                    {/* Valor */}
                    {editingHR === hr ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="65535"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 bg-slate-800 border border-blue-500 rounded px-3 py-1 text-white font-mono text-sm focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseInt(editValue);
                              if (!isNaN(val) && val >= 0 && val <= 65535) {
                                writeHoldingRegister(hr, val);
                              }
                            } else if (e.key === "Escape") {
                              setEditingHR(null);
                              setEditValue("");
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const val = parseInt(editValue);
                            if (!isNaN(val) && val >= 0 && val <= 65535) {
                              writeHoldingRegister(hr, val);
                            }
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditingHR(null);
                            setEditValue("");
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between">
                        <span
                          className={`font-mono text-sm ${
                            hrValues.has(hr)
                              ? "text-green-400 font-semibold"
                              : "text-gray-600 italic"
                          }`}
                        >
                          {hrValues.has(hr)
                            ? `${hrValues.get(hr)} (0x${hrValues.get(hr)?.toString(16).toUpperCase().padStart(4, "0")})`
                            : "Não lido"}
                        </span>
                        <button
                          onClick={() => {
                            setEditingHR(hr);
                            setEditValue(hrValues.get(hr)?.toString() || "0");
                          }}
                          disabled={!serverRunning || !enabledHRs.has(hr)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
                        >
                          ✏️ Escrever
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3">
                <p className="text-xs text-yellow-400">
                  <strong>💡 Dica:</strong> HR 1-6 são os tempos de motor ativo
                  (em ms) configurados no sistema principal. Desabilite HRs não
                  existentes no CLP para evitar timeout.
                </p>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Histórico */}
          <div className="space-y-6">
            {/* Card: Histórico de Eventos */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-3xl">📋</div>
                <h2 className="text-2xl font-semibold">Histórico de Eventos</h2>
              </div>

              <div
                className="overflow-y-auto pr-2 space-y-2 custom-scrollbar"
                style={{ maxHeight: "700px" }}
              >
                {history.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Nenhum evento registrado ainda
                  </p>
                ) : (
                  history.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-900/50 border-l-4 border-blue-500 p-3 rounded"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">
                          {formatTime(item.timestamp)}
                        </span>
                        <span className="text-xs font-mono text-blue-400">
                          {item.action}
                        </span>
                      </div>
                      {item.message && (
                        <p className="text-sm text-gray-300">{item.message}</p>
                      )}
                      {item.coil !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">
                          Coil: {item.coil} | Duração: {item.duration}ms
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Card: Ler Coils (apenas modo client) */}
            {currentMode === "client" && serverRunning && (
              <div className="bg-slate-800/50 backdrop-blur border border-blue-700 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-3xl">📖</div>
                  <h2 className="text-2xl font-semibold">Ler Coils do CLP</h2>
                </div>

                <button
                  onClick={readCoils}
                  disabled={!connected}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
                >
                  🔍 Ler Coils {selectedCoil} - {selectedCoil + 9}
                </button>

                {coilValues.length > 0 && (
                  <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
                    <h3 className="text-sm text-gray-400 mb-3">
                      Valores Lidos (a partir do coil {selectedCoil})
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                      {coilValues.map((value, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded text-center font-mono text-sm ${
                            value
                              ? "bg-green-500/20 border border-green-500 text-green-300"
                              : "bg-gray-500/20 border border-gray-600 text-gray-400"
                          }`}
                        >
                          <div className="text-xs opacity-75">
                            #{selectedCoil + index}
                          </div>
                          <div className="font-bold">{value ? "ON" : "OFF"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Logs do Sistema - Embaixo */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📝</div>
              <h2 className="text-xl font-semibold">
                Logs do Sistema (Últimos 50)
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLogsPaused(!logsPaused)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  logsPaused
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                {logsPaused ? "▶️ Retomar (Buscar Últimos 50)" : "⏸️ Pausar"}
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
              >
                🗑️ Limpar
              </button>
            </div>
          </div>

          {logsPaused && (
            <div className="mb-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 text-yellow-400 text-sm">
              ⏸️ Logs pausados. Clique em "Retomar" para buscar os últimos 50
              logs do sistema.
            </div>
          )}

          <div className="bg-gray-950 rounded-lg p-4 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-600">Aguardando logs...</p>
            ) : (
              <div className="space-y-0.5">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-gray-600 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        fractionalSecondDigits: 3,
                      })}
                    </span>
                    <span className="flex-shrink-0">
                      {getLogIcon(log.level)}
                    </span>
                    <span className="text-cyan-400 flex-shrink-0">
                      [{log.category}]
                    </span>
                    <span className={getLogColor(log.level)}>
                      {log.message}
                    </span>
                    {log.data && (
                      <span className="text-gray-600">
                        {JSON.stringify(log.data)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7);
        }
      `}</style>
    </div>
  );
}
