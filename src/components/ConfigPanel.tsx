"use client";

// ============================================
// COMPONENTE - PAINEL DE CONFIGURAÇÃO
// ============================================

import { useState, useEffect } from "react";
import { SystemConfig, OutputConfig } from "@/types";
import {
  CogIcon,
  ArrowPathIcon,
  CheckIcon,
  BeakerIcon,
  CalculatorIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

export default function ConfigPanel() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Calculadora de delays
  const [distances, setDistances] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [calculatedDelays, setCalculatedDelays] = useState<number[]>([
    0, 0, 0, 0, 0, 0,
  ]);

  // Uptime e restart
  const [uptime, setUptime] = useState<string>("");
  const [restarting, setRestarting] = useState(false);

  // Leitura de HRs do CLP
  const [readingHRs, setReadingHRs] = useState(false);
  const [hrValues, setHrValues] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    fetchConfig();
    fetchUptime();

    // Atualiza uptime a cada 10 segundos
    const interval = setInterval(fetchUptime, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/config");
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

  const restartSystem = async () => {
    if (
      !confirm(
        "Tem certeza que deseja reiniciar o sistema? Todas as conexões serão interrompidas.",
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
          "Sistema reiniciando... A página será recarregada automaticamente.",
        );

        // Aguarda 3 segundos e recarrega a página
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        alert(`Erro: ${data.error}`);
        setRestarting(false);
      }
    } catch (error: any) {
      alert(`Erro ao reiniciar: ${error.message}`);
      setRestarting(false);
    }
  };

  // Lê HRs do CLP
  const readCLPHoldingRegisters = async () => {
    if (!config) return;

    const startAddr = config.motorTimesStartAddress ?? 0;
    const numOutputs = config.outputs.length;

    setReadingHRs(true);
    try {
      const response = await fetch("/api/modbus/read-hr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAddress: startAddr,
          quantity: numOutputs,
        }),
      });

      const data = await response.json();
      if (data.success && data.values) {
        const newMap = new Map<number, number>();
        data.values.forEach((val: number, index: number) => {
          newMap.set(startAddr + index, val);
        });
        setHrValues(newMap);
      } else {
        alert(`Erro ao ler HRs: ${data.error || "Erro desconhecido"}`);
      }
    } catch (error: any) {
      alert(`Erro ao ler HRs: ${error.message}`);
    } finally {
      setReadingHRs(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
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

  const resetConfig = async () => {
    if (!confirm("Resetar para configuração padrão?")) return;

    try {
      const response = await fetch("/api/config", {
        method: "PUT",
      });

      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        alert("Configuração resetada!");
      }
    } catch (error: any) {
      alert(`Erro ao resetar: ${error.message}`);
    }
  };

  // Calculadora de delays
  const calculateDelays = () => {
    if (!config || config.conveyorSpeed <= 0) {
      alert("Configure a velocidade da esteira antes de calcular!");
      return;
    }

    const delays = distances.map((distance) => {
      if (distance <= 0) return 0;
      // delayTime = distância / velocidade
      return Number((distance / config.conveyorSpeed).toFixed(2));
    });

    setCalculatedDelays(delays);
  };

  const applyCalculatedDelays = () => {
    if (!config) return;

    const hasValidDelays = calculatedDelays.some((d) => d > 0);
    if (!hasValidDelays) {
      alert("Calcule os delays primeiro!");
      return;
    }

    const updatedOutputs = config.outputs.map((output, index) => ({
      ...output,
      delayTime: calculatedDelays[index] || output.delayTime,
    }));

    setConfig({ ...config, outputs: updatedOutputs });
    alert("Delays aplicados com sucesso!");
  };

  const clearCalculator = () => {
    setDistances([0, 0, 0, 0, 0, 0]);
    setCalculatedDelays([0, 0, 0, 0, 0, 0]);
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
            Configuração do Sistema
          </h2>
          {uptime && (
            <p className="text-sm text-gray-500 mt-1">Uptime: {uptime}</p>
          )}
        </div>
        <div className="flex gap-2">
        
          <button
            onClick={restartSystem}
            disabled={restarting}
            className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {restarting ? "Reiniciando..." : "Reiniciar Sistema"}
          </button>
          <Link
            href="/test-clp"
            className="px-4 py-2 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 flex items-center gap-2 transition-colors"
          >
            <BeakerIcon className="w-4 h-4" />
            Teste CLP
          </Link>
          <button
            onClick={resetConfig}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Resetar
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
        {/* Conexões Modbus */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Conexões Modbus
          </h3>

          {/* Conexão Slave Pool */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-md font-semibold text-blue-900 mb-3">
              Conexão Slave Pool (Leitura de Sensores)
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modo de Conexão
                </label>
                <select
                  value={config.slaveMode}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      slaveMode: e.target.value as "client" | "server",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="client">
                    Client (Conecta no dispositivo)
                  </option>
                  <option value="server">Server (Aguarda conexão)</option>
                </select>
                <p className="mt-1 text-xs text-gray-600">
                  {config.slaveMode === "client"
                    ? "💡 Sistema conecta no Slave Pool"
                    : "💡 Slave Pool conecta no sistema"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP do Slave
                </label>
                <input
                  type="text"
                  value={config.slaveIp}
                  onChange={(e) =>
                    setConfig({ ...config, slaveIp: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porta do Slave
                </label>
                <input
                  type="number"
                  value={config.slavePort}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      slavePort: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Conexão CLP */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-md font-semibold text-green-900 mb-3">
              Conexão CLP (Envio de Comandos)
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modo de Conexão
                </label>
                <select
                  value={config.clpMode}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      clpMode: e.target.value as "client" | "server",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                >
                  <option value="client">Client (Conecta no CLP)</option>
                  <option value="server">Server (Aguarda CLP conectar)</option>
                </select>
                <p className="mt-1 text-xs text-gray-600">
                  {config.clpMode === "client"
                    ? "💡 Sistema conecta no CLP"
                    : "💡 CLP conecta no sistema"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IP do CLP
                </label>
                <input
                  type="text"
                  value={config.clpIp}
                  onChange={(e) =>
                    setConfig({ ...config, clpIp: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porta do CLP
                </label>
                <input
                  type="number"
                  value={config.clpPort}
                  onChange={(e) =>
                    setConfig({ ...config, clpPort: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HR Inicial (Tempos de Motor)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.motorTimesStartAddress ?? 0}
                  onChange={(e) =>
                    setConfig({ ...config, motorTimesStartAddress: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  title="Endereço inicial dos HRs onde serão escritos os tempos de motor (ex: 1 para pular HR 0)"
                />
                <p className="mt-1 text-xs text-gray-600">
                  💡 HR onde começa os tempos (0-5 padrão, 1-6 se HR 0 reservado)
                </p>
              </div>
              <div className="flex items-center -mt-3">
                  <button
            onClick={readCLPHoldingRegisters}
            disabled={readingHRs || !config}
            className="px-4 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <CogIcon className="w-4 h-4" />
            {readingHRs ? "Lendo HRs..." : "Ler HRs do CLP"}
          </button>
              </div>
            </div>

            {/* Exibir HRs lidos do CLP */}
            {hrValues.size > 0 && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-green-300">
                <h5 className="text-sm font-semibold text-green-900 mb-3">
                  📊 HRs Lidos do CLP
                </h5>
                <div className="grid grid-cols-3 gap-3">
                  {config.outputs.map((output, index) => {
                    const hrAddr = (config.motorTimesStartAddress ?? 0) + index;
                    const value = hrValues.get(hrAddr);
                    return (
                      <div
                        key={output.id}
                        className="bg-gray-50 p-3 rounded border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">
                            HR {hrAddr} - {output.name}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-green-700">
                            {value ?? "-"}
                          </span>
                          <span className="text-xs text-gray-500">ms</span>
                        </div>
                        {value !== undefined && value !== output.activeEngineDuration && (
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ Diferente do configurado ({output.activeEngineDuration}ms)
                          </p>
                        )}
                        {value !== undefined && value === output.activeEngineDuration && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Sincronizado
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Configurações da Esteira */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Esteira</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprimento (m)
              </label>
              <input
                type="number"
                value={config.conveyorLength}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    conveyorLength: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Velocidade (m/s)
              </label>
              <input
                type="number"
                step="0.1"
                value={config.conveyorSpeed}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    conveyorSpeed: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
              />
            </div>
          </div>
        </section>

        {/* Modo Fachina */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Modo Fachina (Limpeza)
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coil Modo Fachina
              </label>
              <input
                type="number"
                value={config.cleaningModeCoil}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    cleaningModeCoil: parseInt(e.target.value),
                  })
                }
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="20"
              />
              <p className="mt-1 text-xs text-gray-500">
                Coil utilizado para ativar/desativar o modo fachina (padrão:
                20). Quando ativo, sinaliza ao CLP que os módulos estão
                levantados e roletes ativos.
              </p>
            </div>
          </div>
        </section>

        {/* Saídas */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Saídas Laterais
          </h3>
          <div className="grid grid-cols-9 gap-3 mb-2 text-xs font-semibold text-gray-600 px-3">
            <div>Nome</div>
            <div>Delay (s)</div>
            <div>Tolerância (s)</div>
            <div>Pulso (ms)</div>
            <div>Coil Entrada</div>
            <div>Coil Saída</div>
            <div>Motor Ativo (ms)</div>
            <div>HR Address</div>
            <div className="text-center">Ativo</div>
          </div>
          <div className="space-y-3">
            {config.outputs.map((output, index) => (
              <OutputConfigRow
                key={output.id}
                output={output}
                onChange={(updated) => {
                  const newOutputs = [...config.outputs];
                  newOutputs[index] = updated;
                  setConfig({ ...config, outputs: newOutputs });
                }}
              />
            ))}
          </div>
        </section>

        {/* Calculadora de Delays */}
        <DelayCalculator
          config={config}
          distances={distances}
          calculatedDelays={calculatedDelays}
          onDistanceChange={(index, value) => {
            const newDistances = [...distances];
            newDistances[index] = value;
            setDistances(newDistances);
          }}
          onCalculate={calculateDelays}
          onApply={applyCalculatedDelays}
          onClear={clearCalculator}
        />
      </div>
    </div>
  );
}

function OutputConfigRow({
  output,
  onChange,
}: {
  output: OutputConfig;
  onChange: (output: OutputConfig) => void;
}) {
  return (
    <div className="grid grid-cols-9 gap-3 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div>
        <input
          type="text"
          value={output.name}
          onChange={(e) => onChange({ ...output, name: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          placeholder="Nome"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.delayTime}
          onChange={(e) =>
            onChange({ ...output, delayTime: parseFloat(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          placeholder="Delay"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.toleranceTime}
          onChange={(e) =>
            onChange({ ...output, toleranceTime: parseFloat(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          placeholder="Tolerância"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.pulseDuration}
          onChange={(e) =>
            onChange({ ...output, pulseDuration: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-yellow-50"
          placeholder="Pulso"
          title="Duração do pulso de saída em milissegundos"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.inputAddress}
          onChange={(e) =>
            onChange({ ...output, inputAddress: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-blue-50"
          placeholder="Entrada"
          title="Coil que RECEBE pulsos (1-6)"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.outputAddress}
          onChange={(e) =>
            onChange({ ...output, outputAddress: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-green-50"
          placeholder="Saída"
          title="Coil que ENVIA pulsos ao CLP (6-11)"
        />
      </div>
      <div>
        <input
          type="number"
          value={output.activeEngineDuration}
          onChange={(e) =>
            onChange({
              ...output,
              activeEngineDuration: parseInt(e.target.value),
            })
          }
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-orange-50"
          placeholder="Motor"
          title="Tempo que o motor ficará ativo (ms) - escrito em holding register para CLP ler"
        />
      </div>
      <div>
        <input
          type="number"
          min="1"
          max="12"
          value={output.motorTimeHRAddress ?? 0}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val >= 1 && val <= 12) {
              onChange({
                ...output,
                motorTimeHRAddress: val,
              });
            }
          }}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-purple-50"
          placeholder="HR"
          title="Endereço do Holding Register onde será escrito o tempo de motor (1-12)"
        />
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

function DelayCalculator({
  config,
  distances,
  calculatedDelays,
  onDistanceChange,
  onCalculate,
  onApply,
  onClear,
}: {
  config: SystemConfig;
  distances: number[];
  calculatedDelays: number[];
  onDistanceChange: (index: number, value: number) => void;
  onCalculate: () => void;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <section className="border-t-4 border-purple-500 pt-6">
      <div className="flex items-center gap-2 mb-4">
        <CalculatorIcon className="w-6 h-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-800">
          Calculadora Automática de Delays
        </h3>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-purple-900 mb-2">
          <strong>Como usar:</strong>
        </p>
        <ol className="text-xs text-purple-800 space-y-1 ml-4 list-decimal">
          <li>Configure a velocidade da esteira acima</li>
          <li>
            Insira a distância (em metros) de cada saída em relação ao início
          </li>
          <li>Clique em "Calcular Delays" para ver os tempos calculados</li>
          <li>
            Clique em "Aplicar aos Delays" para aplicar os valores calculados
          </li>
        </ol>
        <p className="text-xs text-purple-700 mt-2">
          <strong>Fórmula:</strong> Delay (s) = Distância (m) / Velocidade (m/s)
        </p>
        <p className="text-xs text-purple-700">
          <strong>Velocidade atual:</strong> {config.conveyorSpeed} m/s
        </p>
      </div>

      <div className="space-y-3">
        {config.outputs.map((output, index) => (
          <div
            key={output.id}
            className="grid grid-cols-4 gap-3 items-center p-3 bg-white rounded-lg border border-gray-200"
          >
            <div>
              <label className="text-sm font-medium text-gray-700">
                {output.name}
              </label>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Distância (m)
              </label>
              <input
                type="number"
                step="0.1"
                value={distances[index]}
                onChange={(e) =>
                  onDistanceChange(index, parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: 4.0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Delay Calculado (s)
              </label>
              <div className="px-3 py-2 bg-purple-100 border border-purple-300 rounded-lg text-center font-semibold text-purple-900">
                {calculatedDelays[index] > 0
                  ? calculatedDelays[index].toFixed(2)
                  : "—"}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Delay Atual (s)
              </label>
              <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-center text-gray-700">
                {output.delayTime}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onCalculate}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 font-medium transition-colors"
        >
          <CalculatorIcon className="w-5 h-5" />
          Calcular Delays
        </button>
        <button
          onClick={onApply}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium transition-colors"
        >
          <CheckIcon className="w-5 h-5" />
          Aplicar aos Delays
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2 font-medium transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Limpar
        </button>
      </div>
    </section>
  );
}
