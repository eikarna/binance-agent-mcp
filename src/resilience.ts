/**
 * Binance Engine Resilience & Rate Limit Manager
 * Synchronizes local system clock with Binance API server time (eliminates code -1021 timestamp drift),
 * and actively monitors rate limit headers (X-MBX-USED-WEIGHT-1M) to prevent HTTP 429 / IP bans.
 */

export class BinanceResilienceManager {
  private serverTimeOffsetMs: number = 0;
  private lastTimeSync: number = 0;
  private currentUsedWeight1m: number = 0;
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'https://api.binance.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Syncs server time with Binance GET /api/v3/time
   */
  public async syncServerTime(): Promise<number> {
    const start = Date.now();
    try {
      const resp = await fetch(`${this.baseUrl}/api/v3/time`);
      if (!resp.ok) {
        throw new Error(`Time sync failed with status ${resp.status}`);
      }
      const data = await resp.json() as { serverTime: number };
      const roundTrip = Date.now() - start;
      const estimatedServerTime = data.serverTime + Math.floor(roundTrip / 2);
      this.serverTimeOffsetMs = estimatedServerTime - Date.now();
      this.lastTimeSync = Date.now();
      return this.serverTimeOffsetMs;
    } catch (err) {
      console.warn('Failed to sync server time, falling back to local clock:', err);
      return this.serverTimeOffsetMs;
    }
  }

  /**
   * Returns a drift-corrected timestamp for authenticated queries
   */
  public async getCorrectedTimestamp(): Promise<number> {
    // Re-sync if older than 10 minutes
    if (Date.now() - this.lastTimeSync > 600000) {
      await this.syncServerTime();
    }
    return Date.now() + this.serverTimeOffsetMs;
  }

  /**
   * Updates weight tracking from response headers
   */
  public updateWeightFromHeaders(headers: Headers): void {
    const weightHeader = headers.get('x-mbx-used-weight-1m');
    if (weightHeader) {
      const weight = parseInt(weightHeader, 10);
      if (!isNaN(weight)) {
        this.currentUsedWeight1m = weight;
      }
    }
  }

  /**
   * Proactive rate limit guard: checks if weight exceeds safe threshold (e.g. 1000 / 1200 weight)
   */
  public async checkRateLimitBackoff(): Promise<void> {
    const MAX_SAFE_WEIGHT = 1000;
    if (this.currentUsedWeight1m >= MAX_SAFE_WEIGHT) {
      const backoffMs = (this.currentUsedWeight1m - MAX_SAFE_WEIGHT + 1) * 100;
      console.warn(`[RateLimit Guard] High used weight (${this.currentUsedWeight1m}/1200). Backing off for ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}
