// ============================================
// SISTEMA DE LOGGING CENTRALIZADO COM PERSISTÊNCIA
// ============================================

import fs from "fs";
import path from "path";

export type LogLevel = "info" | "warning" | "error" | "success" | "debug";

export interface SystemLog {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class SystemLogger {
  private logs: SystemLog[] = [];
  private maxLogs: number = 1000; // Aumentado para 1000 logs em memória
  private listeners: Set<(logs: SystemLog[]) => void> = new Set();
  private productionMode: boolean = process.env.NODE_ENV === "production";
  private logsDir: string = path.join(process.cwd(), "logs");
  private writeQueue: SystemLog[] = [];
  private writeInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cria diretório de logs se não existir
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    // Inicia rotação de logs a cada hora
    this.startLogRotation();

    // Inicia escrita em lote a cada 5 segundos
    this.startBatchWrite();
  }

  /**
   * Adiciona um log ao sistema
   */
  log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    skipConsole: boolean = false,
  ) {
    const logEntry: SystemLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    };

    // Adiciona ao array mantendo apenas os últimos N logs
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Adiciona à fila de escrita em disco
    this.writeQueue.push(logEntry);

    // Console log (se não for produção ou se for erro crítico)
    if (!skipConsole && (!this.productionMode || level === "error")) {
      const emoji = {
        info: "ℹ️",
        warning: "⚠️",
        error: "❌",
        success: "✅",
        debug: "🔍",
      }[level];

      console.log(`[${category}] ${emoji} ${message}`, data || "");
    }

    // Notifica listeners
    this.notifyListeners();
  }

  /**
   * Log de informação
   */
  info(category: string, message: string, data?: any, skipConsole = false) {
    this.log("info", category, message, data, skipConsole);
  }

  /**
   * Log de sucesso
   */
  success(category: string, message: string, data?: any, skipConsole = false) {
    this.log("success", category, message, data, skipConsole);
  }

  /**
   * Log de aviso
   */
  warning(category: string, message: string, data?: any, skipConsole = false) {
    this.log("warning", category, message, data, skipConsole);
  }

  /**
   * Log de erro
   */
  error(category: string, message: string, data?: any) {
    this.log("error", category, message, data, false); // Sempre mostra erros no console
  }

  /**
   * Log de debug (só em desenvolvimento)
   */
  debug(category: string, message: string, data?: any) {
    if (!this.productionMode) {
      this.log("debug", category, message, data, false);
    }
  }

  /**
   * Retorna todos os logs
   */
  getLogs(): SystemLog[] {
    return [...this.logs];
  }

  /**
   * Retorna os últimos N logs
   */
  getRecentLogs(count: number = 100): SystemLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Limpa todos os logs
   */
  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  /**
   * Deleta logs de uma categoria específica
   */
  deleteLogsByCategory(category: string): number {
    const initialCount = this.logs.length;
    this.logs = this.logs.filter((log) => log.category !== category);
    const deletedCount = initialCount - this.logs.length;
    this.notifyListeners();
    return deletedCount;
  }

  /**
   * Deleta logs de um nível específico
   */
  deleteLogsByLevel(level: string): number {
    const initialCount = this.logs.length;
    this.logs = this.logs.filter((log) => log.level !== level);
    const deletedCount = initialCount - this.logs.length;
    this.notifyListeners();
    return deletedCount;
  }

  /**
   * Adiciona um listener para mudanças nos logs
   */
  subscribe(callback: (logs: SystemLog[]) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners() {
    this.listeners.forEach((callback) => callback([...this.logs]));
  }

  /**
   * Define o modo de produção
   */
  setProductionMode(enabled: boolean) {
    this.productionMode = enabled;
  }

  /**
   * Verifica se está em modo produção
   */
  isProductionMode(): boolean {
    return this.productionMode;
  }

  /**
   * Retorna o nome do arquivo de log para uma data
   */
  private getLogFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `log-${year}-${month}-${day}.jsonl`;
  }

  /**
   * Inicia escrita em lote de logs em disco
   */
  private startBatchWrite(): void {
    this.writeInterval = setInterval(() => {
      if (this.writeQueue.length > 0) {
        this.flushLogsToDisk();
      }
    }, 5000); // A cada 5 segundos
  }

  /**
   * Escreve logs pendentes no disco
   */
  private flushLogsToDisk(): void {
    if (this.writeQueue.length === 0) return;

    try {
      const today = new Date();
      const logFile = path.join(this.logsDir, this.getLogFileName(today));

      // Agrupa logs por linha (JSONL - JSON Lines)
      const logLines =
        this.writeQueue.map((log) => JSON.stringify(log)).join("\n") + "\n";

      // Append ao arquivo do dia
      fs.appendFileSync(logFile, logLines, "utf-8");

      // Limpa fila
      this.writeQueue = [];
    } catch (error) {
      console.error("[SystemLogger] Erro ao escrever logs em disco:", error);
    }
  }

  /**
   * Inicia rotação automática de logs
   */
  private startLogRotation(): void {
    // Executa rotação imediatamente
    this.rotateLogs();

    // Executa rotação a cada 1 hora
    setInterval(
      () => {
        this.rotateLogs();
      },
      60 * 60 * 1000,
    ); // 1 hora
  }

  /**
   * Remove logs com mais de 3 dias
   */
  private rotateLogs(): void {
    try {
      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();
      const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        if (!file.startsWith("log-") || !file.endsWith(".jsonl")) return;

        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);

        // Remove arquivos com mais de 3 dias
        if (stats.mtimeMs < threeDaysAgo) {
          fs.unlinkSync(filePath);
          console.log(`[SystemLogger] 🗑️  Log antigo removido: ${file}`);
        }
      });
    } catch (error) {
      console.error("[SystemLogger] Erro ao rotacionar logs:", error);
    }
  }

  /**
   * Lê logs de um arquivo específico
   */
  readLogsFromFile(date: Date): SystemLog[] {
    try {
      const logFile = path.join(this.logsDir, this.getLogFileName(date));

      if (!fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");

      return lines
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as SystemLog);
    } catch (error) {
      console.error("[SystemLogger] Erro ao ler logs do arquivo:", error);
      return [];
    }
  }

  /**
   * Retorna lista de datas disponíveis (últimos 3 dias)
   */
  getAvailableDates(): string[] {
    try {
      const files = fs.readdirSync(this.logsDir);
      const dates: string[] = [];

      files.forEach((file) => {
        if (file.startsWith("log-") && file.endsWith(".jsonl")) {
          // Extrai data do nome do arquivo: log-2026-05-16.jsonl
          const match = file.match(/log-(\d{4})-(\d{2})-(\d{2})\.jsonl/);
          if (match) {
            const [, year, month, day] = match;
            dates.push(`${year}-${month}-${day}`);
          }
        }
      });

      // Ordena do mais recente para o mais antigo
      return dates.sort().reverse();
    } catch (error) {
      console.error("[SystemLogger] Erro ao listar datas de logs:", error);
      return [];
    }
  }

  /**
   * Para o sistema de logs e limpa recursos
   */
  shutdown(): void {
    if (this.writeInterval) {
      clearInterval(this.writeInterval);
      this.writeInterval = null;
    }

    // Flush final
    this.flushLogsToDisk();
  }
}

// Singleton
export const systemLogger = new SystemLogger();

// Cleanup ao fechar aplicação
if (typeof process !== "undefined") {
  process.on("SIGTERM", () => systemLogger.shutdown());
  process.on("SIGINT", () => systemLogger.shutdown());
  process.on("beforeExit", () => systemLogger.shutdown());
}
