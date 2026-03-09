// ============================================
// GERENCIADOR DE FILAS E PRODUTOS
// ============================================

import { Product, OutputQueue, OutputConfig, SystemLog } from "@/types";
import { v4 as uuidv4 } from "uuid";

export class QueueManager {
  private queues: Map<number, OutputQueue>;
  private products: Map<string, Product>;
  private outputConfigs: Map<number, OutputConfig>;
  private logs: SystemLog[] = [];
  private maxLogs: number = 1000;

  // Estatísticas
  private totalProcessed: number = 0;
  private totalCancelled: number = 0;
  private productsByOutput: Map<number, number> = new Map();

  constructor(outputs: OutputConfig[]) {
    this.queues = new Map();
    this.products = new Map();
    this.outputConfigs = new Map();

    // Inicializar filas e configurações
    outputs.forEach((config) => {
      this.queues.set(config.id, {
        outputId: config.id,
        products: [],
        blocked: false,
        lastUpdate: Date.now(),
      });
      this.outputConfigs.set(config.id, config);
      this.productsByOutput.set(config.id, 0);
    });

    this.log("info", "system", "Sistema de filas inicializado");
  }

  /**
   * Adiciona um produto detectado na entrada
   */
  addProduct(outputId: number): Product | null {
    const config = this.outputConfigs.get(outputId);

    if (!config || !config.enabled) {
      this.log(
        "warning",
        "product",
        `Saída ${outputId} desabilitada ou não configurada`,
      );
      return null;
    }

    const queue = this.queues.get(outputId);
    if (!queue) {
      this.log("error", "queue", `Fila para saída ${outputId} não encontrada`);
      return null;
    }

    // Verifica se a saída está bloqueada
    if (queue.blocked) {
      this.log(
        "warning",
        "queue",
        `Saída ${outputId} bloqueada - produto não adicionado`,
        {
          queueSize: queue.products.length,
        },
      );
      return null;
    }

    const now = Date.now();
    const product: Product = {
      id: uuidv4(),
      outputId,
      detectedAt: now,
      expectedArrivalTime: now + config.delayTime * 1000,
      maxArrivalTime: now + (config.delayTime + config.toleranceTime) * 1000,
      status: "waiting",
    };

    // Adiciona à fila
    queue.products.push(product);
    queue.lastUpdate = now;
    this.products.set(product.id, product);

    this.log(
      "success",
      "product",
      `Produto ${product.id.slice(0, 8)} adicionado para saída ${outputId}`,
      {
        delayTime: config.delayTime,
        queuePosition: queue.products.length,
      },
    );

    return product;
  }

  /**
   * Processa filas e retorna produtos que devem acionar sensores
   */
  processQueues(): Map<number, boolean> {
    const activations = new Map<number, boolean>();
    const now = Date.now();

    this.queues.forEach((queue, outputId) => {
      const config = this.outputConfigs.get(outputId);
      if (!config || !config.enabled) {
        activations.set(outputId, false);
        return;
      }

      // Verifica se há produtos na fila
      if (queue.products.length === 0) {
        activations.set(outputId, false);
        return;
      }

      const product = queue.products[0]; // Primeiro da fila

      // Verifica se o produto já está no status "arrived" (já foi ativado)
      if (product.status === "arrived") {
        const pulseDuration = config.pulseDuration || 500;
        // Continua enviando pulso durante pulseDuration
        if (now - product.expectedArrivalTime < pulseDuration) {
          activations.set(outputId, true);
        } else {
          // Remove após duração do pulso
          this.removeProduct(product.id);
          activations.set(outputId, false);
        }
        return;
      }

      // Verifica se chegou o momento de ativar
      if (now >= product.expectedArrivalTime) {
        // Ativa o sensor pela primeira vez
        activations.set(outputId, true);
        product.status = "arrived";

        const pulseDuration = config.pulseDuration || 500;
        this.log(
          "success",
          "sensor",
          `Produto ${product.id.slice(0, 8)} chegou na saída ${outputId} - Pulso ${pulseDuration}ms`,
          {
            arrivalTime: now - product.detectedAt,
            expectedTime: config.delayTime * 1000,
          },
        );
      }
      // Verifica timeout
      else if (now > product.maxArrivalTime) {
        product.status = "timeout";
        this.totalCancelled++;

        this.log(
          "error",
          "product",
          `Produto ${product.id.slice(0, 8)} timeout na saída ${outputId}`,
          {
            delayTime: config.delayTime,
            toleranceTime: config.toleranceTime,
            actualTime: now - product.detectedAt,
          },
        );

        this.removeProduct(product.id);
        activations.set(outputId, false);
      }
      // Produto em trânsito
      else {
        product.status = "in-transit";
        activations.set(outputId, false);
      }
    });

    return activations;
  }

  /**
   * Remove um produto da fila
   */
  removeProduct(productId: string): boolean {
    const product = this.products.get(productId);
    if (!product) return false;

    const queue = this.queues.get(product.outputId);
    if (queue) {
      queue.products = queue.products.filter((p) => p.id !== productId);
      queue.lastUpdate = Date.now();
    }

    this.products.delete(productId);

    if (product.status === "arrived") {
      this.totalProcessed++;
      const count = this.productsByOutput.get(product.outputId) || 0;
      this.productsByOutput.set(product.outputId, count + 1);
    }

    return true;
  }

  /**
   * Atualiza o estado de bloqueio de uma saída
   */
  setOutputBlocked(outputId: number, blocked: boolean): void {
    const queue = this.queues.get(outputId);
    if (queue) {
      queue.blocked = blocked;
      queue.lastUpdate = Date.now();

      this.log(
        "info",
        "queue",
        `Saída ${outputId} ${blocked ? "bloqueada" : "desbloqueada"}`,
      );
    }
  }

  /**
   * Obtém o estado de uma fila
   */
  getQueue(outputId: number): OutputQueue | undefined {
    return this.queues.get(outputId);
  }

  /**
   * Obtém todas as filas
   */
  getAllQueues(): OutputQueue[] {
    return Array.from(this.queues.values());
  }

  /**
   * Obtém um produto pelo ID
   */
  getProduct(productId: string): Product | undefined {
    return this.products.get(productId);
  }

  /**
   * Obtém todos os produtos ativos
   */
  getAllProducts(): Product[] {
    return Array.from(this.products.values());
  }

  /**
   * Limpa uma fila específica
   */
  clearQueue(outputId: number): void {
    const queue = this.queues.get(outputId);
    if (queue) {
      queue.products.forEach((product) => {
        this.products.delete(product.id);
      });
      queue.products = [];
      queue.lastUpdate = Date.now();

      this.log(
        "warning",
        "queue",
        `Fila da saída ${outputId} limpa manualmente`,
      );
    }
  }

  /**
   * Limpa todas as filas
   */
  clearAllQueues(): void {
    this.queues.forEach((queue) => {
      queue.products = [];
      queue.lastUpdate = Date.now();
    });
    this.products.clear();

    this.log("warning", "system", "Todas as filas foram limpas");
  }

  /**
   * Obtém estatísticas do sistema
   */
  getStats() {
    return {
      totalProcessed: this.totalProcessed,
      totalCancelled: this.totalCancelled,
      totalActive: this.products.size,
      productsByOutput: Object.fromEntries(this.productsByOutput),
      queuesStatus: Array.from(this.queues.values()).map((q) => ({
        outputId: q.outputId,
        size: q.products.length,
        blocked: q.blocked,
      })),
    };
  }

  /**
   * Registra log do sistema
   */
  private log(
    level: SystemLog["level"],
    category: SystemLog["category"],
    message: string,
    metadata?: Record<string, any>,
  ): void {
    const log: SystemLog = {
      id: uuidv4(),
      timestamp: Date.now(),
      level,
      category,
      message,
      metadata,
    };

    this.logs.unshift(log);

    // Limita o tamanho do array de logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console log para debug
    const prefix = `[${category.toUpperCase()}]`;
    switch (level) {
      case "error":
        console.error(prefix, message, metadata || "");
        break;
      case "warning":
        console.warn(prefix, message, metadata || "");
        break;
      case "success":
        console.log("✓", prefix, message, metadata || "");
        break;
      default:
        console.log(prefix, message, metadata || "");
    }
  }

  /**
   * Obtém logs do sistema
   */
  getLogs(limit: number = 100): SystemLog[] {
    return this.logs.slice(0, limit);
  }

  /**
   * Limpa logs
   */
  clearLogs(): void {
    this.logs = [];
    this.log("info", "system", "Logs limpos");
  }
}
