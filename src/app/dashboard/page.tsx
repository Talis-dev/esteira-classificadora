"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import SystemControl from "@/components/SystemControl";
import ConveyorMonitor from "@/components/ConveyorMonitor";
import QueueVisualization from "@/components/QueueVisualization";
import CriticalAlertsWidget from "@/components/CriticalAlertsWidget";
import DistributionControls from "@/components/DistributionControls";
import PulseSensorsMonitor from "@/components/PulseSensorsMonitor";

export default function DashboardPage() {
  const [resetting, setResetting] = useState(false);

  const handleResetCounters = async () => {
    if (
      !confirm("Resetar todos os contadores? Esta ação não pode ser desfeita.")
    ) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch("/api/modbus/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-counters" }),
      });

      const data = await response.json();
      if (data.success) {
        alert("✅ Contadores resetados com sucesso!");
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CriticalAlertsWidget />
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-3 lg:px-4 py-2 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 flex items-center gap-1 lg:gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="text-sm lg:text-base">Voltar</span>
              </Link>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetCounters}
                disabled={resetting}
                className="px-3 py-1.5 lg:px-4 lg:py-2 bg-orange-700 text-white text-sm lg:text-base rounded-lg hover:bg-orange-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <ArrowPathIcon
                  className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Resetar Contagens</span>
                <span className="sm:hidden">Resetar</span>
              </button>
              <Link
                href="/config"
                className="px-3 py-1.5 lg:px-4 lg:py-2 bg-blue-600 text-white text-sm lg:text-base rounded-lg hover:bg-blue-700 transition-colors"
              >
                Configurações
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 lg:px-4 py-4 lg:py-6">
        <div className="grid lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Coluna Esquerda */}
          <div className="lg:col-span-2 space-y-3 lg:space-y-4">
            {/* Mostra apenas em telas < 640px (sm) */}
            <div className="block sm:hidden">
              <SystemControl />
            </div>
            <DistributionControls />
            <QueueVisualization />
          </div>

          {/* Coluna Direita */}
          <div className="space-y-3 lg:space-y-4">
            {/* Mostra apenas em telas >= 640px (sm) */}
            <div className="hidden sm:block">
              <SystemControl />
            </div>
            <ConveyorMonitor />
            <PulseSensorsMonitor />
            {/* <SystemLogs /> */}
          </div>
        </div>
      </main>
    </div>
  );
}
