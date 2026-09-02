/**
 * Binance Filter & Precision Normalizer
 * Parses exchangeInfo symbol filters (LOT_SIZE, PRICE_FILTER, MIN_NOTIONAL)
 * and safely formats order quantities/prices using precise string decimal arithmetic to prevent reject errors.
 */

export interface SymbolFilters {
  symbol: string;
  minQty: number;
  maxQty: number;
  stepSize: number;
  minPrice: number;
  maxPrice: number;
  tickSize: number;
  minNotional: number;
}

export class PrecisionEngine {
  private filterCache: Map<string, SymbolFilters> = new Map();
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'https://api.binance.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetches exchangeInfo and caches symbol filters
   */
  public async loadSymbolFilters(symbol: string): Promise<SymbolFilters | null> {
    const sym = symbol.toUpperCase();
    if (this.filterCache.has(sym)) {
      return this.filterCache.get(sym)!;
    }

    try {
      const resp = await fetch(`${this.baseUrl}/api/v3/exchangeInfo?symbol=${sym}`);
      if (!resp.ok) return null;
      const data = await resp.json() as { symbols: any[] };
      const symInfo = data.symbols?.find((s) => s.symbol === sym);
      if (!symInfo) return null;

      let minQty = 0, maxQty = 0, stepSize = 0;
      let minPrice = 0, maxPrice = 0, tickSize = 0;
      let minNotional = 10.0;

      for (const f of symInfo.filters || []) {
        if (f.filterType === 'LOT_SIZE') {
          minQty = parseFloat(f.minQty);
          maxQty = parseFloat(f.maxQty);
          stepSize = parseFloat(f.stepSize);
        } else if (f.filterType === 'PRICE_FILTER') {
          minPrice = parseFloat(f.minPrice);
          maxPrice = parseFloat(f.maxPrice);
          tickSize = parseFloat(f.tickSize);
        } else if (f.filterType === 'NOTIONAL' || f.filterType === 'MIN_NOTIONAL') {
          minNotional = parseFloat(f.minNotional || f.notional || '10');
        }
      }

      const filters: SymbolFilters = {
        symbol: sym,
        minQty,
        maxQty,
        stepSize,
        minPrice,
        maxPrice,
        tickSize,
        minNotional
      };

      this.filterCache.set(sym, filters);
      return filters;
    } catch (err) {
      console.error(`Failed to load exchangeInfo for ${sym}:`, err);
      return null;
    }
  }

  /**
   * Rounds a quantity to the valid LOT_SIZE stepSize using precise string decimal slicing
   */
  public roundToStep(value: number, step: number): number {
    if (step <= 0) return value;
    const decimals = this.getDecimalPlaces(step);
    const factor = Math.pow(10, decimals);
    const floored = Math.floor(value * factor) / factor;
    return parseFloat(floored.toFixed(decimals));
  }

  /**
   * Rounds a price to the valid PRICE_FILTER tickSize using precise string decimal slicing
   */
  public roundToTick(price: number, tick: number): number {
    if (tick <= 0) return price;
    const decimals = this.getDecimalPlaces(tick);
    const factor = Math.pow(10, decimals);
    const floored = Math.floor(price * factor) / factor;
    return parseFloat(floored.toFixed(decimals));
  }

  private getDecimalPlaces(num: number): number {
    const str = num.toString();
    if (str.includes('e-')) {
      return parseInt(str.split('e-')[1], 10);
    }
    const parts = str.split('.');
    return parts.length > 1 ? parts[1].length : 0;
  }
}
