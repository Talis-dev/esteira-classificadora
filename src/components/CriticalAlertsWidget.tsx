"use client";

// ============================================
// COMPONENTE DE ALERTAS CRÍTICOS
// ============================================

import { useState, useEffect } from "react";
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

interface CriticalAlert {
  id: string;
  timestamp: number;
  type: "connection_lost" | "server_error" | "client_error";
  severity: "critical" | "warning";
  message: string;
  details?: any;
  acknowledged: boolean;
}

export default function CriticalAlertsWidget() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Verifica alertas a cada 5 segundos
    const interval = setInterval(() => {
      fetchAlerts();
    }, 5000);

    fetchAlerts(); // Primeira verificação imediata

    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/system/alerts?unacknowledged=true");
      const data = await response.json();
      const unacknowledged = data.alerts || [];

      setAlerts(unacknowledged);
      setVisible(unacknowledged.length > 0);
    } catch (error) {
      console.error("Erro ao buscar alertas:", error);
    }
  };

  const acknowledgeAll = async () => {
    try {
      await fetch("/api/system/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge" }),
      });
      setAlerts([]);
      setVisible(false);
    } catch (error) {
      console.error("Erro ao reconhecer alertas:", error);
    }
  };

  const acknowledgeOne = async (id: string) => {
    try {
      await fetch("/api/system/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge", alertId: id }),
      });
      setAlerts(alerts.filter((a) => a.id !== id));
      if (alerts.length === 1) {
        setVisible(false);
      }
    } catch (error) {
      console.error("Erro ao reconhecer alerta:", error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("pt-BR");
  };

  if (!visible || alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-red-50 border-2 border-red-500 rounded-lg shadow-2xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            <h3 className="text-lg font-bold text-red-900">
              Alertas Críticos ({alerts.length})
            </h3>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-red-600 hover:text-red-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border-l-4 ${
                alert.severity === "critical"
                  ? "bg-red-100 border-red-500"
                  : "bg-yellow-100 border-yellow-500"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p
                    className={`font-semibold text-sm ${
                      alert.severity === "critical"
                        ? "text-red-900"
                        : "text-yellow-900"
                    }`}
                  >
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatTimestamp(alert.timestamp)}
                  </p>
                  {alert.details && (
                    <p className="text-xs text-gray-700 mt-1 font-mono">
                      {JSON.stringify(alert.details)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => acknowledgeOne(alert.id)}
                  className="text-green-600 hover:text-green-800"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={acknowledgeAll}
          className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <CheckIcon className="h-5 w-5" />
          Reconhecer Todos
        </button>
      </div>
    </div>
  );
}
