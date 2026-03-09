"use client";

// ============================================
// COMPONENTE - VISUALIZAÇÃO DE PRODUTOS RASTREADOS
// ============================================

import { useEffect, useState } from "react";
import { ConveyorSystemState, TrackedProduct } from "@/types/conveyor";
import { ClockIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export default function QueueVisualization() {
  const [systemState, setSystemState] = useState<ConveyorSystemState | null>(
    null,
  );

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 500);
    return () => clearInterval(interval);
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

  if (!systemState) {
    return (
      <div className="bg-white rounded-lg shadow-md p-3 xl:p-4">
        <h2 className="text-lg xl:text-xl font-bold text-gray-900 mb-3">
          Produtos Rastreados
        </h2>
        <p className="text-gray-400 text-sm">Sistema não conectado</p>
      </div>
    );
  }

  const productsByOutput: { [key: number]: TrackedProduct[] } = {
    1: [],
    2: [],
    3: [],
  };

  systemState.trackedProducts.forEach((p) => {
    if (productsByOutput[p.outputId]) {
      productsByOutput[p.outputId].push(p);
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-3 xl:p-4">
      <div className="flex items-center justify-between mb-3 xl:mb-4">
        <h2 className="text-lg xl:text-xl font-bold text-gray-900">
          Produtos Rastreados
        </h2>
        <span className="text-sm text-gray-500">
          Total: {systemState.trackedProducts.length}
        </span>
      </div>

      <div className="space-y-3 xl:space-y-4">
        {[1, 2, 3].map((outputId) => {
          const products = productsByOutput[outputId];
          const count = systemState.stats.outputCounts[outputId] || 0;

          return (
            <div key={outputId} className="border rounded-lg p-3 xl:p-4">
              {/* Header da Saída */}
              <div className="flex items-center justify-between mb-2 xl:mb-3">
                <div className="flex items-center gap-2 xl:gap-3">
                  <span className="text-base xl:text-lg font-semibold text-gray-900">
                    Saída {outputId}
                  </span>
                  <span className="px-2 py-0.5 xl:py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                    {products.length} em trânsito
                  </span>
                  <span className="px-2 py-0.5 xl:py-1 rounded bg-green-100 text-green-700 text-xs font-medium">
                    {count} processados
                  </span>
                </div>
              </div>

              {/* Lista de Produtos */}
              {products.length === 0 ? (
                <p className="text-gray-400 text-xs xl:text-sm italic">
                  Nenhum produto em trânsito
                </p>
              ) : (
                <div className="space-y-2">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: TrackedProduct }) {
  const now = Date.now();
  const timeUntilActivation = product.scheduledActivationTime - now;
  const timeSinceDetection = now - product.detectedAt;

  return (
    <div className="bg-gray-50 rounded p-2 xl:p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-600 font-mono">
          {product.id.slice(0, 8)}
        </span>
        <span
          className={cn(
            "px-1.5 xl:px-2 py-0.5 rounded text-xs font-medium",
            product.status === "waiting" && "bg-yellow-100 text-yellow-700",
            product.status === "activated" && "bg-green-100 text-green-700",
            product.status === "passed" && "bg-gray-100 text-gray-600",
          )}
        >
          {product.status === "waiting" && "Aguardando"}
          {product.status === "activated" && "Acionada"}
          {product.status === "passed" && "Passou"}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          <span>
            {timeUntilActivation > 0
              ? `Ativa em ${Math.round(timeUntilActivation / 1000)}s`
              : `Acionada há ${Math.round(-timeUntilActivation / 1000)}s`}
          </span>
        </div>
        <span>+{Math.round(timeSinceDetection / 1000)}s</span>
      </div>
    </div>
  );
}
