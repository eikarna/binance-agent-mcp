/**
 * Pre-Trade Deterministic Policy Engine
 * Enforces strict risk parameters, hard notional limits, price collars, symbol whitelisting,
 * and emergency circuit breaker before any trade instruction reaches Binance.
 */

export interface PolicyConfig {
  maxNotionalUsd: number;      // Maximum USD value allowed per single order (e.g. $100)
  maxSlippageBps: number;      // Maximum price collar deviation in basis points (e.g. 50 bps = 0.5%)
  allowedSymbols: Set<string>; // Strict whitelist of permitted trading pairs
  isKillSwitchActive: boolean; // Emergency stop circuit breaker
}

export interface TradeValidationRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  quantity: number;
  price?: number;
  referencePrice?: number; // Latest market mark/index price for collar check
}

export interface PolicyValidationResult {
  allowed: boolean;
  reason?: string;
  notionalUsd: number;
}

export class PolicyEngine {
  private config: PolicyConfig;

  constructor(customConfig?: Partial<PolicyConfig>) {
    this.config = {
      maxNotionalUsd: 100.0,
      maxSlippageBps: 50, // 0.5%
      allowedSymbols: new Set(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']),
      isKillSwitchActive: false,
      ...customConfig
    };
  }

  /**
   * Toggle the emergency kill switch
   */
  public setKillSwitch(active: boolean): void {
    this.config.isKillSwitchActive = active;
  }

  public isKillSwitchEngaged(): boolean {
    return this.config.isKillSwitchActive;
  }

  /**
   * Deterministically validates an intended trade against all safety policies
   */
  public validateTrade(request: TradeValidationRequest): PolicyValidationResult {
    // 1. Emergency Kill Switch Check
    if (this.config.isKillSwitchActive) {
      return {
        allowed: false,
        reason: 'CRITICAL: Emergency Kill Switch is engaged. All trading is halted.',
        notionalUsd: 0
      };
    }

    const symbolUpper = request.symbol.toUpperCase();

    // 2. Symbol Whitelist Check
    if (!this.config.allowedSymbols.has(symbolUpper)) {
      return {
        allowed: false,
        reason: `FORBIDDEN_SYMBOL: Symbol ${symbolUpper} is not in the approved whitelist: [${Array.from(this.config.allowedSymbols).join(', ')}]`,
        notionalUsd: 0
      };
    }

    // 3. Resolve execution price for notional calculation
    const effectivePrice = request.price ?? request.referencePrice;
    if (!effectivePrice || effectivePrice <= 0) {
      return {
        allowed: false,
        reason: 'INVALID_PRICE: Trade price or reference mark price must be strictly positive.',
        notionalUsd: 0
      };
    }

    if (request.quantity <= 0) {
      return {
        allowed: false,
        reason: 'INVALID_QUANTITY: Order quantity must be strictly greater than zero.',
        notionalUsd: 0
      };
    }

    const notionalUsd = request.quantity * effectivePrice;

    // 4. Hard Notional USD Cap
    if (notionalUsd > this.config.maxNotionalUsd) {
      return {
        allowed: false,
        reason: `NOTIONAL_CAP_EXCEEDED: Trade notional $${notionalUsd.toFixed(2)} exceeds maximum permitted cap of $${this.config.maxNotionalUsd.toFixed(2)}.`,
        notionalUsd
      };
    }

    // 5. Price Collar (Slippage Protection) for Limit Orders
    if (request.type === 'LIMIT' && request.price && request.referencePrice && request.referencePrice > 0) {
      const priceDiffBps = Math.abs((request.price - request.referencePrice) / request.referencePrice) * 10000;
      if (priceDiffBps > this.config.maxSlippageBps) {
        return {
          allowed: false,
          reason: `PRICE_COLLAR_BREACH: Price deviation of ${(priceDiffBps / 100).toFixed(2)}% exceeds maximum allowed collar of ${(this.config.maxSlippageBps / 100).toFixed(2)}%.`,
          notionalUsd
        };
      }
    }

    return {
      allowed: true,
      notionalUsd
    };
  }
}
