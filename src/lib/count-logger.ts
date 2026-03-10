// ============================================
// SISTEMA DE REGISTRO DE CONTAGEM DE PRODUTOS
// ============================================

import fs from "fs";
import path from "path";

export interface CountRecord {
  id: string;
  timestamp: number;
  outputId: number;
  outputName: string;
  count: number;
  date: string; // YYYY-MM-DD HH:mm:ss
}

class CountLogger {
  private records: CountRecord[] = [];
  private maxRecords: number = 500;
  private logsDir: string = path.join(process.cwd(), "logs");
  private writeQueue: CountRecord[] = [];
  private writeInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cria diretório de logs se não existir
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    // Inicia rotação a cada hora
    this.startLogRotation();

    // Inicia escrita em lote a cada 10 segundos
    this.startBatchWrite();

    // Carrega registros do dia atual
    this.loadTodayRecords();
  }

  /**
   * Registra uma nova contagem
   */
  record(outputId: number, outputName: string, count: number) {
    const now = new Date();
    const record: CountRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      outputId,
      outputName,
      count,
      date: now.toLocaleString("pt-BR"),
    };

    // Adiciona ao array mantendo apenas os últimos N registros
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    // Adiciona à fila de escrita em disco
    this.writeQueue.push(record);
  }

  /**
   * Retorna todos os registros em memória
   */
  getRecords(): CountRecord[] {
    return [...this.records];
  }

  /**
   * Retorna registros de uma saída específica
   */
  getRecordsByOutput(outputId: number): CountRecord[] {
    return this.records.filter((r) => r.outputId === outputId);
  }

  /**
   * Limpa todos os registros
   */
  clear() {
    this.records = [];
  }

  /**
   * Inicia escrita em lote
   */
  private startBatchWrite(): void {
    this.writeInterval = setInterval(() => {
      this.flushWriteQueue();
    }, 10 * 1000); // 10 segundos
  }

  /**
   * Escreve logs pendentes em disco
   */
  private flushWriteQueue(): void {
    if (this.writeQueue.length === 0) return;

    try {
      const logFile = path.join(this.logsDir, this.getLogFileName(new Date()));
      const logLines = this.writeQueue.map((r) => JSON.stringify(r)).join("\n");

      // Append to file
      fs.appendFileSync(logFile, logLines + "\n", "utf-8");

      // Limpa fila
      this.writeQueue = [];
    } catch (error) {
      console.error("[CountLogger] Erro ao escrever registros:", error);
    }
  }

  /**
   * Nome do arquivo de log baseado na data
   */
  private getLogFileName(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `count-${year}-${month}-${day}.jsonl`;
  }

  /**
   * Inicia rotação de logs
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
    );
  }

  /**
   * Remove registros com mais de 1 dia
   */
  private rotateLogs(): void {
    try {
      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        if (!file.startsWith("count-") || !file.endsWith(".jsonl")) return;

        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);

        // Remove arquivos com mais de 1 dia
        if (stats.mtimeMs < oneDayAgo) {
          fs.unlinkSync(filePath);
          console.log(`[CountLogger] 🗑️  Registro antigo removido: ${file}`);
        }
      });
    } catch (error) {
      console.error("[CountLogger] Erro ao rotacionar registros:", error);
    }
  }

  /**
   * Carrega registros do dia atual
   */
  private loadTodayRecords(): void {
    try {
      const logFile = path.join(this.logsDir, this.getLogFileName(new Date()));

      if (!fs.existsSync(logFile)) {
        return;
      }

      const content = fs.readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");

      lines.forEach((line) => {
        try {
          const record: CountRecord = JSON.parse(line);
          this.records.push(record);
        } catch (e) {
          // Ignora linhas inválidas
        }
      });

      // Mantém apenas os últimos maxRecords
      if (this.records.length > this.maxRecords) {
        this.records = this.records.slice(-this.maxRecords);
      }

      console.log(
        `[CountLogger] ✅ ${this.records.length} registros carregados`,
      );
    } catch (error) {
      console.error("[CountLogger] Erro ao carregar registros:", error);
    }
  }

  /**
   * Lê registros de um arquivo específico
   */
  readRecordsFromFile(date: Date): CountRecord[] {
    try {
      const logFile = path.join(this.logsDir, this.getLogFileName(date));

      if (!fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, "utf-8");
      const lines = content.trim().split("\n");
      const records: CountRecord[] = [];

      lines.forEach((line) => {
        try {
          const record: CountRecord = JSON.parse(line);
          records.push(record);
        } catch (e) {
          // Ignora linhas inválidas
        }
      });

      return records;
    } catch (error) {
      console.error("[CountLogger] Erro ao ler registros:", error);
      return [];
    }
  }

  /**
   * Para o logger e salva registros pendentes
   */
  shutdown(): void {
    if (this.writeInterval) {
      clearInterval(this.writeInterval);
    }
    this.flushWriteQueue();
  }
}

// Singleton
const countLogger = new CountLogger();

// Cleanup ao fechar aplicação
if (typeof process !== "undefined") {
  process.on("beforeExit", () => {
    countLogger.shutdown();
  });
}

export default countLogger;
