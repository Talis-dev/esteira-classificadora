import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import SystemControl from "@/components/SystemControl";
import ConveyorMonitor from "@/components/ConveyorMonitor";
import QueueVisualization from "@/components/QueueVisualization";
import SystemLogs from "@/components/SystemLogs";
import CriticalAlertsWidget from "@/components/CriticalAlertsWidget";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CriticalAlertsWidget />
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-3 lg:px-4 py-2 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 flex items-center gap-1 lg:gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                <span className="text-sm lg:text-base">Voltar</span>
              </Link>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">
                Dashboard
              </h1>
            </div>
            <Link
              href="/config"
              className="px-3 py-1.5 lg:px-4 lg:py-2 bg-blue-600 text-white text-sm lg:text-base rounded-lg hover:bg-blue-700 transition-colors"
            >
              Configurações
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 lg:px-4 py-4 lg:py-6">
        <div className="grid lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Coluna Esquerda */}
          <div className="lg:col-span-2 space-y-3 lg:space-y-4">
            <SystemControl />
            <QueueVisualization />
          </div>

          {/* Coluna Direita */}
          <div className="space-y-3 lg:space-y-4">
            <ConveyorMonitor />
            <SystemLogs />
          </div>
        </div>
      </main>
    </div>
  );
}
