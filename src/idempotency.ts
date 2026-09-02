import { createHash } from 'crypto';

/**
 * Durable Idempotency Engine
 * Generates deterministic client order IDs (newClientOrderId) from trade intent hashes
 * to eliminate duplicate fills on network retries, timeouts, or agent replay loops.
 */

export interface TradeIntent {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  quantity: number;
  price?: number;
  intentNonce: string; // Unique user/agent action identifier
}

export type OrderState = 'PENDING' | 'EXECUTED' | 'REJECTED';

export interface CachedOrderRecord {
  clientOrderId: string;
  state: OrderState;
  response?: any;
  createdAt: number;
}

export class IdempotencyEngine {
  private cache: Map<string, CachedOrderRecord> = new Map();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 3600000) { // 1 hour TTL
    this.ttlMs = ttlMs;
  }

  /**
   * Generates a deterministic, Binance-compliant clientOrderId (max 36 chars)
   * Pattern: "mcp_" + SHA256(intent).substring(0, 28)
   */
  public generateClientOrderId(intent: TradeIntent): string {
    const rawPayload = `${intent.symbol}:${intent.side}:${intent.type}:${intent.quantity}:${intent.price ?? 'MKT'}:${intent.intentNonce}`;
    const hash = createHash('sha256').update(rawPayload).digest('hex');
    return `mcp_${hash.substring(0, 28)}`;
  }

  /**
   * Checks if an intent is already in-flight or executed
   */
  public checkIntent(clientOrderId: string): CachedOrderRecord | null {
    this.cleanupExpired();
    return this.cache.get(clientOrderId) || null;
  }

  /**
   * Registers a pending execution to block duplicate parallel calls
   */
  public recordPending(clientOrderId: string): boolean {
    const existing = this.checkIntent(clientOrderId);
    if (existing && (existing.state === 'PENDING' || existing.state === 'EXECUTED')) {
      return false; // Already locked/executed
    }

    this.cache.set(clientOrderId, {
      clientOrderId,
      state: 'PENDING',
      createdAt: Date.now()
    });
    return true;
  }

  /**
   * Updates state to EXECUTED or REJECTED
   */
  public recordResult(clientOrderId: string, state: 'EXECUTED' | 'REJECTED', response?: any): void {
    this.cache.set(clientOrderId, {
      clientOrderId,
      state,
      response,
      createdAt: Date.now()
    });
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [id, record] of this.cache.entries()) {
      if (now - record.createdAt > this.ttlMs) {
        this.cache.delete(id);
      }
    }
  }
}
