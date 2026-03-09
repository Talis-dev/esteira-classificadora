"use client";

// ============================================
// COMPONENTE - VISUALIZAÇÃO DE FILAS
// ============================================

import { useEffect, useState } from "react";
import { OutputQueue, Product } from "@/types";
import { ClockIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { cn, formatDuration, timeRemaining } from "@/lib/utils";

interface QueueVisualizationProps {
  autoRefresh?: boolean;
}

export default function QueueVisualization({
  autoRefresh = true,
}: QueueVisualizationProps) {
  const [queues, setQueues] = useState<OutputQueue[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    fetchQueues();
    if (autoRefresh) {
      const interval = setInterval(fetchQueues, 500);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Tick para atualizar contadores de tempo
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const fetchQueues = async () => {
    try {
      const response = await fetch("/api/modbus/status");
      const data = await response.json();
      if (data.success && data.state) {
        setQueues(data.state.queues || []);
      }
    } catch (error) {
      console.error("Erro ao buscar filas:", error);
    }
  };

  const clearQueue = async (outputId: number) => {
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear", outputId }),
      });

      if (response.ok) {
        fetchQueues();
      }
    } catch (error) {
      console.error("Erro ao limpar fila:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-3 xl:p-4">
      <h2 className="text-lg xl:text-xl font-bold text-gray-900 mb-3 xl:mb-4">
        Filas de Produtos
      </h2>

      <div className="space-y-3 xl:space-y-4">
        {queues.map((queue) => (
          <div key={queue.outputId} className="border rounded-lg p-3 xl:p-4">
            {/* Header da Fila */}
            <div className="flex items-center justify-between mb-2 xl:mb-3">
              <div className="flex items-center gap-2 xl:gap-3">
                <span className="text-base xl:text-lg font-semibold text-gray-900">
                  Saída {queue.outputId}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 xl:py-1 rounded text-xs font-medium",
                    queue.blocked
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700",
                  )}
                >
                  {queue.blocked ? "Bloqueada" : "Livre"}
                </span>
                <span className="px-2 py-0.5 xl:py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                  {queue.products.length}{" "}
                  {queue.products.length === 1 ? "produto" : "produtos"}
                </span>
              </div>

              {queue.products.length > 0 && (
                <button
                  onClick={() => clearQueue(queue.outputId)}
                  className="text-red-600 hover:text-red-700 text-xs xl:text-sm font-medium flex items-center gap-1"
                >
                  <XCircleIcon className="w-4 h-4" />
                  Limpar
                </button>
              )}
            </div>

            {/* Lista de Produtos */}
            {queue.products.length === 0 ? (
              <p className="text-gray-400 text-xs xl:text-sm italic">
                Nenhum produto na fila
              </p>
            ) : (
              <div className="space-y-2 xl:space-y-2">
                {queue.products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    position={index + 1}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  position,
}: {
  product: Product;
  position: number;
}) {
  const remaining = timeRemaining(product.expectedArrivalTime);
  const progress = Math.max(
    0,
    Math.min(
      100,
      ((Date.now() - product.detectedAt) /
        (product.expectedArrivalTime - product.detectedAt)) *
        100,
    ),
  );

  return (
    <div className="bg-gray-50 rounded p-2 xl:p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-1.5 xl:mb-2">
        <div className="flex items-center gap-1.5 xl:gap-2">
          <span className="text-xs font-bold text-gray-500">#{position}</span>
          <span className="text-xs text-gray-600 font-mono">
            {product.id.slice(0, 8)}
          </span>
        </div>
        <span
          className={cn(
            "px-1.5 xl:px-2 py-0.5 rounded text-xs font-medium",
            product.status === "waiting" && "bg-yellow-100 text-yellow-700",
            product.status === "in-transit" && "bg-blue-100 text-blue-700",
            product.status === "arrived" && "bg-green-100 text-green-700",
            product.status === "cancelled" && "bg-red-100 text-red-700",
            product.status === "timeout" && "bg-red-100 text-red-700",
          )}
        >
          {product.status === "waiting" && "Aguardando"}
          {product.status === "in-transit" && "Em trânsito"}
          {product.status === "arrived" && "Chegou"}
          {product.status === "cancelled" && "Cancelado"}
          {product.status === "timeout" && "Timeout"}
        </span>
      </div>

      {/* Barra de Progresso */}
      <div className="mb-1.5 xl:mb-2">
        <div className="w-full bg-gray-200 rounded-full h-1.5 xl:h-2">
          <div
            className={cn(
              "h-1.5 xl:h-2 rounded-full transition-all duration-300",
              product.status === "in-transit" && "bg-blue-500",
              product.status === "arrived" && "bg-green-500",
              product.status === "waiting" && "bg-yellow-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          <span>
            {remaining > 0 ? formatDuration(remaining) : "Chegando..."}
          </span>
        </div>
        <span>{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
