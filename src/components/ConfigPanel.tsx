"use client";

// ============================================
// COMPONENTE - PAINEL DE CONFIGURAÇÃO
// ============================================

import { useState, useEffect } from "react";
import { ConveyorSystemConfig, ConveyorOutput } from "@/types/conveyor";
import {
  CogIcon,
  ArrowPathIcon,
  CheckIcon,
  BeakerIcon,
  LockClosedIcon,
  LockOpenIcon,
  BoltIcon,
  PowerIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

export default function ConfigPanel() {
  const [config, setConfig] = useState<ConveyorSystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [uptime, setUptime] = useState<string>("Carregando...");
  const [restarting, setRestarting] = useState(false);

  const ADMIN_PASSWORD = "415263";

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value === ADMIN_PASSWORD) {
      setIsUnlocked(true);
    } else {
      setIsUnlocked(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchUptime();

    // Atualiza uptime a cada 5 segundos
    const uptimeInterval = setInterval(fetchUptime, 5000);
    return () => clearInterval(uptimeInterval);
  }, []);

  const fetchUptime = async () => {
    try {
      const response = await fetch("/api/system/restart");
      const data = await response.json();
      if (data.success) {
        setUptime(data.uptime.formatted);
      }
    } catch (error) {
      console.error("Erro ao buscar uptime:", error);
    }
  };

  const handleRestartServer = async () => {
    if (
      !confirm(
        "⚠️ ATENÇÃO: Isso vai encerrar o servidor Node.js!\n\nO agendador de tarefas do Windows irá reiniciá-lo automaticamente.\n\nTodos os clientes conectados serão desconectados.\n\nDeseja continuar?",
      )
    ) {
      return;
    }

    setRestarting(true);
    try {
      const response = await fetch("/api/system/restart", {
        method: "POST",
      });

      const data = await response.json();
      if (data.success) {
        alert(
          "✅ Servidor será reiniciado em 2 segundos...\n\nAguarde aproximadamente 10 segundos e recarregue a página.",
        );
      } else {
        alert(`❌ Erro: ${data.error}`);
        setRestarting(false);
      }
    } catch (error: any) {
      alert(`❌ Erro: ${error.message}`);
      setRestarting(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/conveyor-config");
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Erro ao buscar configuração:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch("/api/conveyor-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: config }),
      });

      const data = await response.json();
      if (data.success) {
        alert("Configuração salva com sucesso!");
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetCounters = async () => {
    if (!confirm("Resetar contadores de todas as saídas?")) return;

    try {
      const response = await fetch("/api/modbus/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-counters" }),
      });

      const data = await response.json();
      if (data.success) {
        alert("Contadores resetados!");
        fetchConfig();
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  if (loading || !config) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CogIcon className="w-6 h-6" />
            Configuração da Esteira Classificadora
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure conexão, sensores, válvulas e parâmetros do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={isUnlocked ? "/test-clp" : "#"}
            className="px-4 py-2 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 flex items-center gap-2 transition-colors"
          >
            <BeakerIcon className="w-4 h-4" />
            Teste CLP
          </Link>
          <button
            onClick={resetCounters}
            className="px-4 py-2 rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Resetar Contadores
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckIcon className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Campo de Senha para Configurações Avançadas */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
              {isUnlocked ? (
                <>
                  <LockOpenIcon className="w-5 h-5 text-green-600" />
                  <span className="text-green-600">
                    Configurações Avançadas Desbloqueadas
                  </span>
                </>
              ) : (
                <>
                  <LockClosedIcon className="w-5 h-5 text-amber-700" />
                  Senha para Configurações Avançadas
                </>
              )}
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="password"
                maxLength={6}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className={`w-40 px-3 py-2 border-2 rounded-lg text-center text-lg font-mono tracking-widest ${
                  isUnlocked
                    ? "border-green-500 bg-green-50"
                    : "border-amber-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                }`}
                placeholder="••••••"
              />
              {isUnlocked && (
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                  <CheckIcon className="w-5 h-5" />
                  <span>Acesso liberado</span>
                </div>
              )}
            </div>
            <p className="text-xs text-amber-700 mt-2">
              {isUnlocked
                ? "✅ Endereços Modbus, conexão CLP e parâmetros da esteira liberados para edição"
                : "🔒 Digite a senha para editar conexão CLP, endereços Modbus e parâmetros da esteira"}
            </p>
          </div>

          {/* Uptime e Botão de Reiniciar Servidor */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <BoltIcon className="w-4 h-4" />
                <span className="font-semibold">Uptime:</span>
                <span className="font-mono">{uptime}</span>
              </div>
            </div>
            <button
              onClick={handleRestartServer}
              disabled={!isUnlocked || restarting}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              title={
                !isUnlocked
                  ? "Desbloqueie as configurações avançadas para usar este botão"
                  : "Reiniciar servidor Node.js"
              }
            >
              <PowerIcon
                className={`w-4 h-4 ${restarting ? "animate-spin" : ""}`}
              />
              {restarting ? "Reiniciando..." : "Reiniciar Servidor"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Conexão CLP */}
        <section className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            Conexão CLP Modbus TCP
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço IP do CLP
              </label>
              <input
                type="text"
                value={config.connection.ip}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    connection: { ...config.connection, ip: e.target.value },
                  })
                }
                disabled={!isUnlocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="192.168.3.115"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porta Modbus
              </label>
              <input
                type="number"
                value={config.connection.port}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    connection: {
                      ...config.connection,
                      port: parseInt(e.target.value),
                    },
                  })
                }
                disabled={!isUnlocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="502"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={config.connection.timeout}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    connection: {
                      ...config.connection,
                      timeout: parseInt(e.target.value),
                    },
                  })
                }
                disabled={!isUnlocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="5000"
              />
            </div>
          </div>
        </section>

        {/* Parâmetros da Esteira */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Parâmetros da Esteira
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diâmetro da Esteira (m)
              </label>
              <input
                type="number"
                step="0.01"
                value={config.conveyorDiameter}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    conveyorDiameter: parseFloat(e.target.value),
                  })
                }
                disabled={!isUnlocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="0.3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Diâmetro do tambor principal da esteira (metros)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pulsos por Volta do Eixo
              </label>
              <input
                type="number"
                value={config.rpmPulsesPerRevolution}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    rpmPulsesPerRevolution: parseInt(e.target.value),
                  })
                }
                disabled={!isUnlocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Pulsos do sensor RPM por volta do eixo de tração
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciclo de Leitura (ms)
              </label>
              <input
                type="number"
                value={config.readCycleMs}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    readCycleMs: parseInt(e.target.value),
                  })
                }
                disabled={!isUnlocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Intervalo de leitura (5ms = 200 Hz, captura pulsos rápidos)
              </p>
            </div>
          </div>

          {/* Segunda linha de parâmetros */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relação de Transmissão (Gear Ratio)
              </label>
              <input
                type="number"
                step="0.1"
                value={config.gearRatio ?? 1}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    gearRatio: parseFloat(e.target.value),
                  })
                }
                disabled={!isUnlocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Relação velocidade eixo:esteira (ex: 10 = eixo 10x mais rápido)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diâmetro do Eixo de Tração (m)
              </label>
              <input
                type="number"
                step="0.001"
                value={config.axleDiameter ?? 0.03}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    axleDiameter: parseFloat(e.target.value),
                  })
                }
                disabled={!isUnlocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="0.03"
              />
              <p className="text-xs text-gray-500 mt-1">
                Diâmetro do eixo onde está o sensor RPM (ex: 0.03 = 30mm)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Debounce Sensor Gatilho (ms)
              </label>
              <input
                type="number"
                value={config.triggerDebounceMs ?? 8}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    triggerDebounceMs: parseInt(e.target.value),
                  })
                }
                disabled={!isUnlocked}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="8"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tempo mínimo entre pulsos do gatilho (evita duplicatas)
              </p>
            </div>
          </div>
        </section>

        {/* Entradas (HR16) */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Entradas Digitais (HR16)
          </h3>
          <div className="space-y-2">
            {Object.entries(config.inputs).map(([key, input]) => (
              <div
                key={key}
                className="grid grid-cols-6 gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <input
                    disabled={!isUnlocked}
                    type="text"
                    value={input.name}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        inputs: {
                          ...config.inputs,
                          [key]: { ...input, name: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex gap-1 items-center">
                  <span className="text-xs text-gray-500">HR</span>
                  <input
                    type="number"
                    min="0"
                    max="65535"
                    value={input.address.hr}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        inputs: {
                          ...config.inputs,
                          [key]: {
                            ...input,
                            address: {
                              ...input.address,
                              hr: parseInt(e.target.value) || 0,
                            },
                          },
                        },
                      })
                    }
                    disabled={!isUnlocked}
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-gray-500">Bit</span>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={input.address.bit}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        inputs: {
                          ...config.inputs,
                          [key]: {
                            ...input,
                            address: {
                              ...input.address,
                              bit: parseInt(e.target.value) || 0,
                            },
                          },
                        },
                      })
                    }
                    disabled={!isUnlocked}
                    className="w-12 px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {input.type === "pulse" ? (
                    <div>
                      <ArrowPathIcon className="inline-block w-4 h-4 mr-1" />
                      Pulso
                    </div>
                  ) : (
                    <div>
                      <BoltIcon className="inline-block w-4 h-4 mr-1" />
                      Digital
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled={!isUnlocked}
                    checked={input.normallyOn}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        inputs: {
                          ...config.inputs,
                          [key]: { ...input, normallyOn: e.target.checked },
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-600">Normally ON</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    disabled={!isUnlocked}
                    type="checkbox"
                    checked={input.logChanges}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        inputs: {
                          ...config.inputs,
                          [key]: { ...input, logChanges: e.target.checked },
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-600">Logar</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    disabled={!isUnlocked}
                    type="checkbox"
                    checked={input.enabled}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        inputs: {
                          ...config.inputs,
                          [key]: { ...input, enabled: e.target.checked },
                        },
                      })
                    }
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-600">Ativo</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Saídas (Válvulas/Braços) */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Saídas (Válvulas/Braços) - HR1
          </h3>
          <div className="grid grid-cols-7 gap-3 mb-2 text-xs font-semibold text-gray-600 px-3">
            <div>Nome</div>
            <div>Endereço</div>
            <div>Delay (ms)</div>
            <div>Ativação (ms)</div>
            <div>Por Minuto</div>
            <div>Modo Manual</div>
            <div className="text-center">Ativo</div>
          </div>
          <div className="space-y-3">
            {config.conveyorOutputs.map((output, index) => (
              <OutputConfigRow
                key={output.id}
                output={output}
                isUnlocked={isUnlocked}
                onChange={(updated) => {
                  const newOutputs = [...config.conveyorOutputs];
                  newOutputs[index] = updated;
                  setConfig({ ...config, conveyorOutputs: newOutputs });
                }}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Delay: tempo do gatilho até acionamento | Ativação: tempo que
            válvula fica aberta | Por Minuto: meta de peças/min (0 =
            desabilitado) | Modo Manual: forçar aberto/fechado ou automático
          </p>
        </section>
      </div>
    </div>
  );
}

function OutputConfigRow({
  output,
  onChange,
  isUnlocked,
}: {
  output: ConveyorOutput;
  onChange: (output: ConveyorOutput) => void;
  isUnlocked: boolean;
}) {
  return (
    <div className="grid grid-cols-7 gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <input
          disabled={!isUnlocked}
          type="text"
          value={output.name}
          onChange={(e) => onChange({ ...output, name: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Nome"
        />
      </div>
      <div className="flex gap-1 items-center">
        <span className="text-xs text-gray-500">HR</span>
        <input
          type="number"
          min="0"
          max="65535"
          value={output.address.hr}
          onChange={(e) =>
            onChange({
              ...output,
              address: { ...output.address, hr: parseInt(e.target.value) || 0 },
            })
          }
          disabled={!isUnlocked}
          className="w-14 px-1 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <span className="text-xs text-gray-500">Bit</span>
        <input
          type="number"
          min="0"
          max="15"
          value={output.address.bit}
          onChange={(e) =>
            onChange({
              ...output,
              address: {
                ...output.address,
                bit: parseInt(e.target.value) || 0,
              },
            })
          }
          disabled={!isUnlocked}
          className="w-10 px-1 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
      <div>
        <input
          disabled={!isUnlocked}
          type="number"
          value={output.delayMs}
          onChange={(e) =>
            onChange({ ...output, delayMs: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          placeholder="2000"
        />
      </div>
      <div>
        <input
          disabled={!isUnlocked}
          type="number"
          value={output.activationMs}
          onChange={(e) =>
            onChange({ ...output, activationMs: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          placeholder="500"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.targetPerMinute}
          onChange={(e) =>
            onChange({ ...output, targetPerMinute: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          placeholder="0"
        />
        <p className="text-xs text-gray-400 mt-1">
          {output.currentCount}/{output.targetPerMinute || "∞"}
        </p>
      </div>
      <div>
        <select
          value={output.manualMode}
          onChange={(e) =>
            onChange({
              ...output,
              manualMode: e.target.value as
                | "auto"
                | "force-open"
                | "force-closed"
                | "disabled",
            })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        >
          <option value="auto">Auto</option>
          <option value="force-open">Forçar Abrir</option>
          <option value="force-closed">Forçar Fechar</option>
          <option value="disabled">Desabilitado</option>
        </select>
      </div>
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={output.enabled}
          onChange={(e) => onChange({ ...output, enabled: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded"
        />
      </div>
    </div>
  );
}
