interface BacktestParams {
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

interface Position {
  date: Date;
  priceUsd: number;
  entryPriceUsd: number;
  shares: number;
  amountKrw: number;
  amountUsd: number;
  drawdown: number;
}

interface TradeHistory {
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
  private data: any[] = [];
  private positions: Position[] = [];
  private cash: number;
  private portfolioValueHistory: any[] = [];
  private tradeHistory: TradeHistory[] = [];

  constructor(private params: BacktestParams) {
    this.cash = params.initialCash;
  }

  async fetchData() {
    // Yahoo Finance API를 사용하여 데이터 가져오기
    const response = await fetch(`/api/stock-data?symbol=TQQQ&startDate=${this.params.startDate}&endDate=${this.params.endDate || new Date().toISOString().split('T')[0]}`);
    const data = await response.json();
    
    this.data = data.map((item: any) => ({
      ...item,
      drawdown: 0
    }));
    
    return this.data;
  }

  // 나머지 메서드들도 TypeScript로 변환...
}
