import Link from "next/link";
import Image from "next/image";
import { CogIcon, ChartBarIcon, HomeIcon } from "@heroicons/react/24/outline";
import CriticalAlertsWidget from "@/components/CriticalAlertsWidget";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <CriticalAlertsWidget />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="SmartConveyor Logo"
              width={518}
              height={219}
              priority
              className="max-w-md w-full h-auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Direcionamento Inteligente de Esteira Distribuidora
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Gerenciamento inteligente de esteira distribuidora com comunicação
            Modbus, controle de filas e monitoramento em tempo real
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card Dashboard */}
          <Link
            href="/dashboard"
            className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <ChartBarIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-500">Monitoramento em tempo real</p>
              </div>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Visualização de filas de produtos
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Status das conexões Modbus
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Logs e estatísticas do sistema
              </li>
            </ul>
          </Link>

          {/* Card Configurações */}
          <Link
            href="/config"
            className="group bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <CogIcon className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Configurações
                </h2>
                <p className="text-gray-500">Ajustes e parâmetros</p>
              </div>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                Configuração de conexões Modbus
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                Ajuste de tempos e tolerâncias
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                Configuração das 6 saídas laterais
              </li>
            </ul>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Recursos do Sistema
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Precisão</h4>
              <p className="text-sm text-gray-600">
                Controle preciso de tempo com tolerância de 1s para cada produto
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⚡</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Performance</h4>
              <p className="text-sm text-gray-600">
                Ciclo de leitura de 100ms para resposta rápida do sistema
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">
                Monitoramento
              </h4>
              <p className="text-sm text-gray-600">
                Dashboard completo com visualização em tempo real
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
