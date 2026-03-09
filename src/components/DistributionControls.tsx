"use client";

// ============================================
// COMPONENTE - CONTROLES DE DISTRIBUIÇÃO
// ============================================

import { useState, useEffect } from "react";
import { ConveyorSystemConfig } from "@/types/conveyor";
import { cn } from "@/lib/utils";

export default function DistributionControls() {
  const [config, setConfig] = useState<ConveyorSystemConfig | null>(null);
  const [distributionMode, setDistributionMode] = useState<
    "manual" | "equal" | "percentage"
  >("manual");
  const [targets, setTargets] = useState<{ [key: number]: number }>({
    1: 0,
    2: 0,
    3: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/conveyor-config");
      const data = await response.json();
      setConfig(data.config);
      setDistributionMode(data.config.distributionMode || "manual");

      // Carrega targets
      const newTargets: { [key: number]: number } = {};
      data.config.conveyorOutputs.forEach((output: any) => {
        newTargets[output.id] = output.targetPerMinute || 0;
      });
      setTargets(newTargets);
    } catch (error) {
      console.error("Erro ao carregar config:", error);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setLoading(true);
    try {
      // Atualiza conveyorOutputs com novos targets
      const updatedOutputs = config.conveyorOutputs.map((output) => ({
        ...output,
        targetPerMinute: targets[output.id] || 0,
      }));

      const response = await fetch("/api/conveyor-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: {
            distributionMode,
            conveyorOutputs: updatedOutputs,
          },
        }),
      });

      if (response.ok) {
        alert("✅ Configuração salva com sucesso!");
        fetchConfig();
      } else {
        alert("❌ Erro ao salvar configuração");
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const modeDescriptions = {
    manual: "Cada saída tem meta individual independente",
    equal: "Alterna igualmente entre saídas habilitadas (round-robin)",
    percentage: "Distribui proporcionalmente conforme as metas configuradas",
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Controle de Distribuição
      </h2>

      {/* Modo de Distribuição */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Modo de Distribuição
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setDistributionMode("manual")}
            className={cn(
              "py-2 px-3 rounded-lg text-sm font-medium transition-all",
              distributionMode === "manual"
                ? "bg-blue-600 text-white ring-2 ring-blue-400"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            Manual
          </button>
          <button
            onClick={() => setDistributionMode("equal")}
            className={cn(
              "py-2 px-3 rounded-lg text-sm font-medium transition-all",
              distributionMode === "equal"
                ? "bg-green-600 text-white ring-2 ring-green-400"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            Igual
          </button>
          <button
            onClick={() => setDistributionMode("percentage")}
            className={cn(
              "py-2 px-3 rounded-lg text-sm font-medium transition-all",
              distributionMode === "percentage"
                ? "bg-purple-600 text-white ring-2 ring-purple-400"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
          >
            Porcentagem
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {modeDescriptions[distributionMode]}
        </p>
      </div>

      {/* Targets por Minuto */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Metas por Minuto (0 = ilimitado)
        </label>
        <div className="grid grid-cols-3 gap-3">
          {config.conveyorOutputs.map((output) => (
            <div key={output.id} className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">
                {output.name}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={targets[output.id] || 0}
                  onChange={(e) =>
                    setTargets({
                      ...targets,
                      [output.id]: parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={!output.enabled}
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg text-sm",
                    output.enabled
                      ? "border-gray-300 focus:ring-2 focus:ring-blue-500"
                      : "bg-gray-100 border-gray-200 cursor-not-allowed",
                  )}
                />
                <span className="absolute right-3 top-2 text-xs text-gray-400">
                  /min
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botão Salvar */}
      <button
        onClick={handleSave}
        disabled={loading}
        className={cn(
          "w-full py-3 rounded-lg font-medium transition-all",
          "bg-blue-600 text-white hover:bg-blue-700 active:scale-95",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        {loading ? "Salvando..." : "💾 Salvar Configuração"}
      </button>
    </div>
  );
}
