import yahooFinance from 'yahoo-finance2';

export interface BacktestParams {
  initialCash: number;
  startDate: string;
  endDate?: string;
  exchangeRate: number;
  initialInvestment: number;
  dropInterval: number;
  multiplier: number;
  sellRecovery: number;
  maxSteps?: number;
  minPurchase?: number;
}

export interface Position {
  date: Date;
  priceUsd: number;
  entryPriceUsd: number;
  shares: number;
  amountKrw: number;
  amountUsd: number;
  drawdown: number;
}

export interface TradeHistory {
  date: Date;
  type: 'BUY' | 'SELL';
  priceUsd: number;
  shares: number;
  amountKrw: number;
  amountUsd: number;
  drawdown: number;
  reason: string;
  portfolioValueKrw: number;
  portfolioValueUsd: number;
  remainingCash: number;
}

export class TQQQBacktest {
  private data: any = null;
  private positions: Position[] = [];
  private cash: number;
  private portfolioValueHistory: any[] = [];
  private tradeHistory: TradeHistory[] = [];

  constructor(private params: BacktestParams) {
    this.cash = params.initialCash;
  }

  async fetchData() {
    const endDate = this.params.endDate || new Date().toISOString().split('T')[0];
    const result = await yahooFinance.historical('TQQQ', {
      start: this.params.startDate,
      end: endDate
    });
    
    this.data = result.map(item => ({
      ...item,
      DrawDown: 0 // Calculate drawdown
    }));
    
    return this.data;
  }

  // ... 나머지 메서드들은 비슷한 방식으로 TypeScript로 변환
} 