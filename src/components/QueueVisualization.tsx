"use client";

// ============================================
// COMPONENTE - VISUALIZAÇÃO DE PRODUTOS E REGISTROS
// ============================================

import { useEffect, useState } from "react";
import { ConveyorSystemState } from "@/types/conveyor";
import { cn } from "@/lib/utils";

interface CountRecord {
  id: string;
  timestamp: number;
  outputId: number;
  outputName: string;
  count: number;
  date: string;
}

export default function QueueVisualization() {
  const [systemState, setSystemState] = useState<ConveyorSystemState | null>(
    null,
  );
  const [records, setRecords] = useState<CountRecord[]>([]);

  useEffect(() => {
    fetchStatus();
    fetchRecords();
    const statusInterval = setInterval(fetchStatus, 500);
    const recordsInterval = setInterval(fetchRecords, 5000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(recordsInterval);
    };
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/modbus/status");
      const data = await response.json();
      if (data.success && data.state) {
        setSystemState(data.state);
      }
    } catch (error) {
      console.error("Erro ao buscar status:", error);
    }
  };

  const fetchRecords = async () => {
    try {
      const response = await fetch("/api/count-records");
      const data = await response.json();
      if (data.success) {
        setRecords(data.records);
      }
    } catch (error) {
      console.error("Erro ao buscar registros:", error);
    }
  };

  if (!systemState) {
    return (
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
          Produtos Rastreados
        </h2>
        <p className="text-gray-400 text-sm">Sistema não conectado</p>
      </div>
    );
  }

  const productsByOutput: { [key: number]: number } = {
    1: 0,
    2: 0,
    3: 0,
  };

  systemState.trackedProducts.forEach((p) => {
    if (productsByOutput[p.outputId] !== undefined) {
      productsByOutput[p.outputId]++;
    }
  });

  return (
    <div className="space-y-4">
      {/* Tabela de Status */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Status das Saídas
          </h2>
          <span className="text-xs sm:text-sm text-gray-500">
            Total: {systemState.trackedProducts.length} em trânsito
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2 px-3 font-semibold text-gray-700">
                  Saída
                </th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700">
                  Em Trânsito
                </th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700">
                  Processados
                </th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700">
                  Por Minuto
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((outputId) => {
                const inTransit = productsByOutput[outputId];
                const processed = systemState.stats.outputCounts[outputId] || 0;
                const perMinute =
                  systemState.stats.outputCountsPerMinute[outputId] || 0;
                const outputName = `Saída ${outputId}`;

                return (
                  <tr
                    key={outputId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2.5 px-3 font-medium text-gray-900">
                      {outputName}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-medium",
                          inTransit > 0
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {inTransit}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">
                        {processed}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                        {perMinute}/min
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabela de Registros */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Histórico de Contagem
          </h2>
          <span className="text-xs sm:text-sm text-gray-500">
            Últimos {records.length} registros
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">
                  Data/Hora
                </th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">
                  Saída
                </th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700">
                  Contagem
                </th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-8 text-center text-gray-400 text-sm"
                  >
                    Nenhum registro encontrado
                  </td>
                </tr>
              ) : (
                records
                  .slice()
                  .reverse()
                  .map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-600 text-xs">
                        {record.date}
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900">
                        {record.outputName}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                          {record.count}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
