"use client";

// ============================================
// PÁGINA DE VISUALIZAÇÃO DE LOGS DO SISTEMA
// ============================================

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SystemLog } from "@/lib/system-logger";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  CalendarIcon,
  FunnelIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  BugAntIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(""); // Vazio = será definido após buscar datas
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false); // Desabilitado por padrão

  // Busca logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);

      let url = "/api/logs?source=";

      if (selectedDate === "memory") {
        url += "memory";
      } else {
        url += `file&date=${selectedDate}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("❌ Erro ao buscar logs:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Busca datas disponíveis e define data de hoje como padrão
  const fetchAvailableDates = useCallback(async () => {
    try {
      const response = await fetch("/api/logs?source=file");
      const data = await response.json();

      if (data.success && data.dates) {
        setAvailableDates(data.dates);

        // Define a data de hoje como padrão se ainda não foi definida
        if (!selectedDate && data.dates.length > 0) {
          const today = data.dates[0]; // Primeira data é sempre a mais recente

          setSelectedDate(today);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar datas:", error);
    }
  }, [selectedDate]);

  // Limpa logs em memória
  const clearLogs = async () => {
    if (!confirm("Deseja limpar todos os logs em memória?")) return;

    try {
      const response = await fetch("/api/logs", { method: "DELETE" });
      const data = await response.json();

      if (data.success) {
        setLogs([]);
        alert("Logs limpos com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao limpar logs:", error);
      alert("Erro ao limpar logs");
    }
  };

  // Deleta logs por categoria
  const deleteByCategory = async () => {
    if (selectedCategory === "all") {
      alert("Selecione uma categoria específica para deletar");
      return;
    }

    const count = logs.filter(
      (log) => log.category === selectedCategory,
    ).length;
    if (
      !confirm(
        `Deseja deletar ${count} logs da categoria "${selectedCategory}"?`,
      )
    )
      return;

    try {
      const response = await fetch(`/api/logs?category=${selectedCategory}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        // Remove logs da categoria localmente
        setLogs(logs.filter((log) => log.category !== selectedCategory));
        alert(`${count} logs deletados com sucesso!`);
        // Reseta filtro de categoria
        setSelectedCategory("all");
      }
    } catch (error) {
      console.error("Erro ao deletar logs:", error);
      alert("Erro ao deletar logs");
    }
  };

  // Deleta logs por nível
  const deleteByLevel = async () => {
    if (selectedLevel === "all") {
      alert("Selecione um nível específico para deletar");
      return;
    }

    const count = logs.filter((log) => log.level === selectedLevel).length;
    if (
      !confirm(
        `Deseja deletar ${count} logs do nível "${selectedLevel.toUpperCase()}"?`,
      )
    )
      return;

    try {
      const response = await fetch(`/api/logs?level=${selectedLevel}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        // Remove logs do nível localmente
        setLogs(logs.filter((log) => log.level !== selectedLevel));
        alert(`${count} logs deletados com sucesso!`);
        // Reseta filtro de nível
        setSelectedLevel("all");
      }
    } catch (error) {
      console.error("Erro ao deletar logs:", error);
      alert("Erro ao deletar logs");
    }
  };

  // Exporta logs
  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs-${selectedDate}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtra logs
  useEffect(() => {
    let filtered = logs;

    // Filtro por nível
    if (selectedLevel !== "all") {
      filtered = filtered.filter((log) => log.level === selectedLevel);
    }

    // Filtro por categoria
    if (selectedCategory !== "all") {
      filtered = filtered.filter((log) => log.category === selectedCategory);
    }

    // Filtro por busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(search) ||
          log.category.toLowerCase().includes(search) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(search)),
      );
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, selectedLevel, selectedCategory]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchLogs();
      }, 3000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [autoRefresh, fetchLogs]);

  // Busca datas disponíveis apenas uma vez (ao montar componente)
  useEffect(() => {
    fetchAvailableDates();
  }, [fetchAvailableDates]);

  // Busca inicial e quando mudar a data (só executa se selectedDate estiver definido)
  useEffect(() => {
    if (selectedDate) {
      fetchLogs();
    }
  }, [selectedDate, fetchLogs]);

  // Categorias únicas
  const categories = Array.from(
    new Set(logs.map((log) => log.category)),
  ).sort();

  // Ícone por nível
  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <ExclamationCircleIcon className="w-4 h-4 text-red-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case "success":
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case "debug":
        return <BugAntIcon className="w-4 h-4 text-purple-500" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-blue-500" />;
    }
  };

  // Cor do texto por nível (estilo terminal)
  const getLevelTextColor = (level: string) => {
    switch (level) {
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      case "success":
        return "text-green-400";
      case "debug":
        return "text-purple-400";
      default:
        return "text-blue-400";
    }
  };

  // Estado de expansão dos logs
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/config"
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2 shrink-0"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Voltar</span>
              </Link>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-800">
                  Logs do Sistema
                </h1>
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  Visualize e filtre eventos
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchLogs}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2 text-sm"
                title="Atualizar logs"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition text-sm ${
                  autoRefresh
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
                title="Auto-refresh a cada 3s"
              >
                <ArrowPathIcon
                  className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Auto</span>
              </button>
              <button
                onClick={exportLogs}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2 text-sm"
                title="Exportar logs filtrados"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden md:inline">Exportar</span>
              </button>
              {selectedLevel !== "all" && (
                <button
                  onClick={deleteByLevel}
                  className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-2 text-sm"
                  title={`Deletar logs do nível ${selectedLevel}`}
                >
                  <TrashIcon className="w-4 h-4" />
                  <span className="hidden md:inline">Deletar Nível</span>
                </button>
              )}
              {selectedCategory !== "all" && (
                <button
                  onClick={deleteByCategory}
                  className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2 text-sm"
                  title={`Deletar logs da categoria ${selectedCategory}`}
                >
                  <TrashIcon className="w-4 h-4" />
                  <span className="hidden md:inline">Deletar Cat.</span>
                </button>
              )}
              {selectedDate === "memory" && (
                <button
                  onClick={clearLogs}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center gap-2 text-sm"
                  title="Limpar todos os logs em memória"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span className="hidden md:inline">Limpar</span>
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Busca */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Nível */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Todos os níveis</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="debug">Debug</option>
              </select>
            </div>

            {/* Filtro Categoria */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Todas as categorias</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Data */}
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="memory">Memória (Real-time)</option>
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs md:text-sm text-gray-600">
            <span>
              Total: <strong>{logs.length}</strong> logs
            </span>
            <span>
              Filtrados: <strong>{filteredLogs.length}</strong> logs
            </span>
            <span>
              Fonte:{" "}
              <strong>
                {selectedDate === "memory" ? "Memória" : "Arquivo"}
              </strong>
            </span>
          </div>
        </div>

        {/* Logs Console */}
        <div className="bg-gray-950 rounded-lg shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">Carregando logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="font-mono text-xs">
              {[...filteredLogs].reverse().map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const hasData = log.data && Object.keys(log.data).length > 0;

                return (
                  <div
                    key={log.id}
                    className="border-b border-gray-800 hover:bg-gray-900/50 transition"
                  >
                    <div
                      className={`flex items-start gap-3 px-4 py-2 ${hasData ? "cursor-pointer" : ""}`}
                      onClick={() => hasData && toggleExpand(log.id)}
                    >
                      {/* Timestamp */}
                      <span className="text-gray-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          fractionalSecondDigits: 3,
                        })}
                      </span>

                      {/* Ícone de nível */}
                      <span className="shrink-0">
                        {getLevelIcon(log.level)}
                      </span>

                      {/* Categoria */}
                      <span className="text-cyan-400 shrink-0 min-w-[120px]">
                        [{log.category}]
                      </span>

                      {/* Mensagem */}
                      <span
                        className={`flex-1 ${getLevelTextColor(log.level)}`}
                      >
                        {log.message}
                      </span>

                      {/* Indicador de expansão */}
                      {hasData && (
                        <span className="text-gray-600 shrink-0">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                      )}
                    </div>

                    {/* Dados expandidos */}
                    {isExpanded && hasData && (
                      <div className="px-4 pb-3 pl-[200px]">
                        <pre className="text-gray-300 text-xs overflow-x-auto bg-gray-900 p-3 rounded">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
