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
} from "@heroicons/react/24/outline";
import Link from "next/link";

export default function ConfigPanel() {
  const [config, setConfig] = useState<ConveyorSystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

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
            href="/test-clp"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diâmetro do Rolo (m)
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Diâmetro do rolo principal em metros
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pulsos por Revolução
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="10"
              />
              <p className="text-xs text-gray-500 mt-1">
                Quantidade de pulsos do sensor por volta completa
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Intervalo de leitura dos sensores (50ms recomendado)
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
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
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
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
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
                    className="w-12 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {input.type === "pulse" ? "🔄 Pulso" : "🔌 Digital"}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
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
            <div>Meta</div>
            <div>Modo Manual</div>
            <div className="text-center">Ativo</div>
          </div>
          <div className="space-y-3">
            {config.conveyorOutputs.map((output, index) => (
              <OutputConfigRow
                key={output.id}
                output={output}
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
            válvula fica aberta | Meta: quantidade alvo (0 = ilimitado)
          </p>
        </section>
      </div>
    </div>
  );
}

function OutputConfigRow({
  output,
  onChange,
}: {
  output: ConveyorOutput;
  onChange: (output: ConveyorOutput) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <input
          type="text"
          value={output.name}
          onChange={(e) => onChange({ ...output, name: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
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
          className="w-14 px-1 py-1 text-sm border border-gray-300 rounded"
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
          className="w-10 px-1 py-1 text-sm border border-gray-300 rounded"
        />
      </div>
      <div>
        <input
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
          value={output.targetCount}
          onChange={(e) =>
            onChange({ ...output, targetCount: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          placeholder="0"
        />
        <p className="text-xs text-gray-400 mt-1">
          {output.currentCount}/{output.targetCount || "∞"}
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
