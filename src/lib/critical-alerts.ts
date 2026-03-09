// ============================================
// SISTEMA DE NOTIFICAÇÕES DE FALHAS CRÍTICAS
// ============================================

export interface CriticalAlert {
  id: string;
  timestamp: number;
  type: "connection_lost" | "server_error" | "client_error";
  severity: "critical" | "warning";
  message: string;
  details?: any;
  acknowledged: boolean;
}

class CriticalAlertsManager {
  private alerts: CriticalAlert[] = [];
  private maxAlerts: number = 50;

  /**
   * Adiciona um alerta crítico
   */
  addAlert(
    type: CriticalAlert["type"],
    severity: CriticalAlert["severity"],
    message: string,
    details?: any,
  ) {
    const alert: CriticalAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      severity,
      message,
      details,
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Mantém apenas os últimos N alertas
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    // Log no console para garantir que não passe despercebido
    console.error(`🚨 ALERTA CRÍTICO [${type}]: ${message}`, details || "");
  }

  /**
   * Retorna todos os alertas não reconhecidos
   */
  getUnacknowledgedAlerts(): CriticalAlert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  /**
   * Retorna todos os alertas
   */
  getAllAlerts(): CriticalAlert[] {
    return [...this.alerts];
  }

  /**
   * Marca um alerta como reconhecido
   */
  acknowledgeAlert(id: string) {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Marca todos os alertas como reconhecidos
   */
  acknowledgeAll() {
    this.alerts.forEach((a) => (a.acknowledged = true));
  }

  /**
   * Limpa alertas reconhecidos
   */
  clearAcknowledged() {
    this.alerts = this.alerts.filter((a) => !a.acknowledged);
  }

  /**
   * Verifica se há alertas não reconhecidos
   */
  hasUnacknowledgedAlerts(): boolean {
    return this.alerts.some((a) => !a.acknowledged);
  }

  /**
   * Retorna a contagem de alertas não reconhecidos
   */
  getUnacknowledgedCount(): number {
    return this.alerts.filter((a) => !a.acknowledged).length;
  }
}

// Singleton
export const criticalAlerts = new CriticalAlertsManager();
