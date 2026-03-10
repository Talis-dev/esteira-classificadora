"use client";

// ============================================
// COMPONENTE - MONITOR DE SENSORES DE PULSO
// ============================================

import { useEffect, useState } from "react";
import { ConveyorSystemState } from "@/types/conveyor";
import { BoltSlashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export default function PulseSensorsMonitor() {
  const [systemState, setSystemState] = useState<ConveyorSystemState | null>(
    null,
  );

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 100); // Atualiza rápido para capturar pulsos
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/modbus/status");
      const data = await response.json();

      if (data.running && data.state) {
        setSystemState(data.state);
      } else {
        setSystemState(null);
      }
    } catch (error) {
      console.error("Erro ao buscar status:", error);
      setSystemState(null);
    }
  };

  if (!systemState) {
    return null; // Não mostra se sistema não está rodando
  }

  const now = Date.now();
  const PULSE_ACTIVE_THRESHOLD = 50; // Considera ativo se pulso foi nos últimos 50ms

  const rpmActive = now - systemState.inputs.rpmLastPulse < PULSE_ACTIVE_THRESHOLD;
  const fullTurnActive = now - systemState.inputs.fullTurnLastPulse < PULSE_ACTIVE_THRESHOLD;
  const triggerActive = now - systemState.inputs.triggerLastPulse < PULSE_ACTIVE_THRESHOLD;

  return (
    <div className="bg-white rounded-lg shadow-md p-3 lg:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base lg:text-lg font-bold text-gray-900 flex items-center gap-2">
          <ArrowPathIcon className="w-5 h-5 text-purple-600" />
          Sensores de Pulso
        </h3>
      </div>

      {/* Grid de Sensores */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        {/* Pulso RPM */}
        <div className="border rounded-lg p-2 lg:p-3 text-center">
          <div className="mb-2">
            <div
              className={cn(
                "w-8 h-8 lg:w-10 lg:h-10 mx-auto rounded-full transition-all duration-100",
                rpmActive
                  ? "bg-yellow-500 shadow-lg shadow-yellow-500/50 animate-pulse"
                  : "bg-gray-300",
              )}
            />
          </div>
          <p className="text-xs lg:text-sm font-semibold text-gray-700">
            Pulso RPM
          </p>
        </div>

        {/* Volta Completa */}
        <div className="border rounded-lg p-2 lg:p-3 text-center">
          <div className="mb-2">
            <div
              className={cn(
                "w-8 h-8 lg:w-10 lg:h-10 mx-auto rounded-full transition-all duration-100",
                fullTurnActive
                  ? "bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse"
                  : "bg-gray-300",
              )}
            />
          </div>
          <p className="text-xs lg:text-sm font-semibold text-gray-700">
            Volta Completa
          </p>
        </div>

        {/* Gatilho Produto */}
        <div className="border rounded-lg p-2 lg:p-3 text-center">
          <div className="mb-2">
            <div
              className={cn(
                "w-8 h-8 lg:w-10 lg:h-10 mx-auto rounded-full transition-all duration-100",
                triggerActive
                  ? "bg-green-500 shadow-lg shadow-green-500/50 animate-pulse"
                  : "bg-gray-300",
              )}
            />
          </div>
          <p className="text-xs lg:text-sm font-semibold text-gray-700">
            Gatilho Produto
          </p>
        </div>
      </div>
    </div>
  );
}
