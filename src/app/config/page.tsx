import Link from "next/link";
import { ArrowLeftIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import ConfigPanel from "@/components/ConfigPanel";

export default function ConfigPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                Voltar
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Configurações
              </h1>
            </div>
            <Link
              href="/logs"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
            >
              <DocumentTextIcon className="w-5 h-5" />
              Logs do Sistema
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <ConfigPanel />
        </div>
      </main>
    </div>
  );
}
