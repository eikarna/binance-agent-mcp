export interface ArbitrageOpportunity {
  route: string[];
  expectedProfitPercent: number;
  executableAmount: number;
  timestamp: number;
}

export interface AgentSettlementPayload {
  agentId: string;
  signature: string;
  opportunityId: string;
  executionRoute: string[];
  tradeSizes: number[];
  estimatedPnL: number;
  timestamp: number;
}
