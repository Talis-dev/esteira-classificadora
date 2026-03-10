"use client";

// ============================================
// COMPONENTE - MONITOR DA ESTEIRA
// ============================================

import { useEffect, useState } from "react";
import { ConveyorSystemState } from "@/types/conveyor";
import {
  SignalIcon,
  SignalSlashIcon,
  CheckCircleIcon,
  BoltIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";
import { CheckIcon, LockClosedIcon, LockOpenIcon, StopCircleIcon } from "@heroicons/react/24/solid";

export default function ConveyorMonitor() {
  const [systemState, setSystemState] = useState<ConveyorSystemState | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/modbus/status");
      const data = await response.json();

      // Apenas usar dados se sistema está realmente rodando
      if (data.running && data.state) {
        setSystemState(data.state);
      } else {
        setSystemState(null);
      }
    } catch (error) {
      console.error("Erro ao buscar status:", error);
      setSystemState(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>;
  }

  if (!systemState) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Sistema não conectado</p>
      </div>
    );
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-3 xl:p-4 space-y-3 xl:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg xl:text-xl font-bold text-gray-900">
          Monitor do Sistema
        </h2>
        <div className="flex items-center gap-2">
          {systemState.connected ? (
            <span className="flex items-center gap-1 xl:gap-2 text-green-600 font-medium text-sm xl:text-base">
              <SignalIcon className="w-4 h-4 xl:w-5 xl:h-5" />
              Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1 xl:gap-2 text-red-600 font-medium text-sm xl:text-base">
              <SignalSlashIcon className="w-4 h-4 xl:w-5 xl:h-5" />
              Desconectado
            </span>
          )}
        </div>
      </div>

      {/* Alerta de Inputs Travados */}
      {systemState.stuckInputs && systemState.stuckInputs.length > 0 && (
        <div className="bg-red-100 border-2 border-red-500 rounded-lg p-3 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-sm font-bold text-red-900">
              ⚠️ INPUTS TRAVADOS DETECTADOS
            </span>
          </div>
          <div className="space-y-1">
            {systemState.stuckInputs.map((alert, idx) => {
              const stuckTime = Math.floor(
                (Date.now() - alert.stuckSince) / 1000,
              );
              return (
                <div key={idx} className="text-xs text-red-800 ml-5">
                  🔴 <strong>{alert.inputName}</strong> - HR{alert.address.hr}{" "}
                  Bit
                  {alert.address.bit} - Travado há {stuckTime}s
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inputs Status */}
      <div className="border rounded-lg p-2">
        <h3 className="font-semibold text-sm mb-2 text-gray-700">
          Entradas
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div
            className={cn(
              "flex items-center gap-1 font-semibold",
              systemState.inputs.motorRunning
                ? "text-green-600"
                : "text-gray-400",
            )}
          >
            <BoltIcon className="w-4 h-4" />
            <span>
              Motor {systemState.inputs.motorRunning ? "Ligado" : "Desligado"}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 font-semibold",
              systemState.inputs.doorOpen ? "text-red-600" : "text-green-600",
            )}
          >
            <span>
              {systemState.inputs.doorOpen
                ? <><LockOpenIcon className="w-4 h-4 inline justify-center" /> Porta Aberta</>
                : <><LockClosedIcon className="w-4 h-4 inline justify-center" /> Porta Fechada</>}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 font-semibold",
              systemState.inputs.emergencyPressed
                ? "text-red-600 font-bold"
                : "text-green-600",
            )}
          >
            <span>
              {systemState.inputs.emergencyPressed
                ? <><StopCircleIcon className="w-4 h-4 inline justify-center" /> EMERGÊNCIA</>
                : <><CheckIcon className="w-4 h-4 inline justify-center" /> Emergência OK</>}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 font-semibold",
              systemState.inputs.inverterFault
                ? "text-red-600"
                : "text-green-600",
            )}
          >
            <span>
              {systemState.inputs.inverterFault
                ? <><XMarkIcon className="w-4 h-4 inline justify-center" /> Inversor Falha</>
                : <> <CheckIcon className="w-4 h-4 inline justify-center" /> Inversor OK</>}
            </span>
          </div>
        </div>
      </div>

      {/* Outputs Status */}
      <div className="border rounded-lg p-2">
        <h3 className="font-semibold text-sm mb-2 text-gray-700">
          Saídas
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((id) => {
            const active =
              id === 1
                ? systemState.outputs.valve1Active
                : id === 2
                  ? systemState.outputs.valve2Active
                  : systemState.outputs.valve3Active;
            return (
              <div
                key={id}
                className={cn(
                  "text-center py-2 rounded-lg text-xs font-semibold",
                  active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400",
                )}
              >
                Válvula {id}
                <br />
                {active ? "ABERTA" : "Fechada"}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contadores por Minuto */}
      {systemState.stats.outputCountsPerMinute && (
        <div className="border rounded-lg p-2 bg-blue-50">
          <h3 className="font-semibold text-sm mb-2 text-blue-900">
            📊 Produção por Minuto
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((id) => {
              const count = systemState.stats.outputCountsPerMinute[id] || 0;
              return (
                <div
                  key={id}
                  className="text-center py-2 rounded-lg bg-white border border-blue-200"
                >
                  <div className="text-2xl font-bold text-blue-600">
                    {count}
                  </div>
                  <div className="text-xs text-gray-600">Saída {id}</div>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Resetado a cada 60 segundos
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t">
        <div>
          <p className="text-xs text-gray-500">Detectados</p>
          <p className="text-xl font-bold text-blue-600">
            {systemState.stats.totalDetected}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Desviados</p>
          <p className="text-xl font-bold text-green-600">
            {systemState.stats.totalDiverted}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Passou</p>
          <p className="text-xl font-bold text-gray-600">
            {systemState.stats.totalPassed}
          </p>
        </div>
      </div>

      {/* Speed, RPM & Peças/min */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t">
        <div>
          <p className="text-xs text-gray-500">Velocidade</p>
          <p className="text-lg font-bold text-purple-600">
            {systemState.stats.currentSpeed.toFixed(2)} m/min
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">RPM</p>
          <p className="text-lg font-bold text-orange-600">
            {systemState.stats.currentRPM.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Peças/min</p>
          <p className="text-lg font-bold text-green-600">
            {systemState.stats.piecesPerMinute || 0}
          </p>
        </div>
      </div>

      {/* Uptime */}
      <div className="pt-2 border-t">
        <p className="text-xs text-gray-400">
          Tempo ativado: {formatUptime(systemState.stats.uptime)}
        </p>
      </div>
    </div>
  );
}
