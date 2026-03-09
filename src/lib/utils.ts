// ============================================
// UTILITÁRIOS
// ============================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes do Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata tempo em milissegundos para string legível
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Formata timestamp para hora legível
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("pt-BR");
}

/**
 * Formata timestamp para data e hora completa
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("pt-BR");
}

/**
 * Calcula tempo restante até um timestamp futuro
 */
export function timeRemaining(futureTimestamp: number): number {
  return Math.max(0, futureTimestamp - Date.now());
}

/**
 * Formata bytes para string legível
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Calcula porcentagem
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
