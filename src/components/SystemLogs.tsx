"use client";

// ============================================
// COMPONENTE - LOGS DO SISTEMA
// ============================================

import { useEffect, useState } from "react";
import { SystemLog } from "@/types";
import { TrashIcon } from "@heroicons/react/24/outline";
import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { cn, formatTime } from "@/lib/utils";

export default function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/modbus/status");
      const data = await response.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error("Erro ao buscar logs:", error);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearLogs" }),
      });
      setLogs([]);
    } catch (error) {
      console.error("Erro ao limpar logs:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-2 xl:p-4">
      <div className="flex items-center justify-between mb-3 xl:mb-4">
        <h2 className="text-lg xl:text-xl font-bold text-gray-900">Logs do Sistema</h2>
        <button
          onClick={clearLogs}
          className="text-red-600 hover:text-red-700 text-xs xl:text-sm font-medium flex items-center gap-1"
        >
          <TrashIcon className="w-4 h-4" />
          Limpar
        </button>
      </div>

      <div className="space-y-1.5 xl:space-y-2 max-h-80 xl:max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-400 text-xs xl:text-sm italic text-center py-6 xl:py-8">
            Nenhum log registrado
          </p>
        ) : (
          logs.map((log) => <LogEntry key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}

function LogEntry({ log }: { log: SystemLog }) {
  const Icon = {
    info: InformationCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon,
    success: CheckCircleIcon,
  }[log.level];

  const colorClasses = {
    info: "text-blue-600 bg-blue-50",
    warning: "text-yellow-600 bg-yellow-50",
    error: "text-red-600 bg-red-50",
    success: "text-green-600 bg-green-50",
  }[log.level];

  return (
    <div className={cn("p-2 xl:p-3 rounded-lg border", colorClasses)}>
      <div className="flex items-start gap-1.5 xl:gap-2">
        <Icon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 xl:gap-2 mb-0.5 xl:mb-1">
            <span className="text-xs font-mono text-gray-500">
              {formatTime(log.timestamp)}
            </span>
            <span className="text-xs font-semibold uppercase px-1.5 xl:px-2 py-0.5 rounded bg-white bg-opacity-50">
              {log.category}
            </span>
          </div>
          <p className="text-xs xl:text-sm font-medium">{log.message}</p>
          {log.metadata && (
            <pre className="text-xs mt-1 opacity-75 font-mono">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
