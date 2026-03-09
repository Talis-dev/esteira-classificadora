// ============================================
// RASTREADOR DE CONEXÕES
// ============================================

import { systemLogger } from "./system-logger";

export interface ConnectionInfo {
  id: string;
  ip: string;
  port: number;
  connectedAt: number;
  lastActivity: number;
}

class ConnectionTracker {
  private connections: Map<string, ConnectionInfo> = new Map();
  private serverInfo = {
    ip: "0.0.0.0",
    port: 502,
  };

  /**
   * Registra uma nova conexão
   */
  addConnection(socket: any): string {
    const ip = socket.remoteAddress?.replace("::ffff:", "") || "desconhecido";
    const port = socket.remotePort || 0;
    const id = `${ip}:${port}`;

    const connectionInfo: ConnectionInfo = {
      id,
      ip,
      port,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.connections.set(id, connectionInfo);

    systemLogger.success(
      "Conexão",
      `Cliente conectado: ${ip}:${port}`,
      { total: this.connections.size },
    );

    return id;
  }

  /**
   * Remove uma conexão
   */
  removeConnection(id: string) {
    const conn = this.connections.get(id);
    if (conn) {
      this.connections.delete(id);
      systemLogger.info(
        "Conexão",
        `Cliente desconectado: ${conn.ip}:${conn.port}`,
        { total: this.connections.size },
      );
    }
  }

  /**
   * Atualiza a última atividade de uma conexão
   */
  updateActivity(id: string) {
    const conn = this.connections.get(id);
    if (conn) {
      conn.lastActivity = Date.now();
    }
  }

  /**
   * Retorna todas as conexões ativas
   */
  getConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Retorna o número de conexões ativas
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Retorna informações do servidor
   */
  getServerInfo() {
    return { ...this.serverInfo };
  }

  /**
   * Define informações do servidor
   */
  setServerInfo(ip: string, port: number) {
    this.serverInfo = { ip, port };
  }

  /**
   * Limpa todas as conexões
   */
  clearConnections() {
    this.connections.clear();
  }
}

// Singleton
export const connectionTracker = new ConnectionTracker();
