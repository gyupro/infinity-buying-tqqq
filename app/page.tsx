'use client';

import { useState } from 'react';
import BacktestForm from './components/BacktestForm';
import BacktestResults from './components/BacktestResults';
import BacktestChart from './components/BacktestChart';
import TradeHistory from './components/TradeHistory';

interface BacktestResults {
  initialInvestment: number;
  finalPortfolioValue: number;
  totalReturn: number;
  numberOfPurchases: number;
  totalInvested: number;
  remainingCash: number;
  maxDrawdown: number;
  chartData: {
    dates: string[];
    portfolioValues: number[];
    buyHoldValues: number[];
    tqqqPrices: number[];
    drawdowns: number[];
  };
  tradeHistory: Trade[];
}

export default function Home() {
  const [results, setResults] = useState<BacktestResults | null>(null);

  const handleBacktest = async (formData: any) => {
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const validatedResults = {
        ...data,
        initialInvestment: Number(data.initialInvestment) || 0,
        finalPortfolioValue: Number(data.finalPortfolioValue) || 0,
        totalReturn: Number(data.totalReturn) || 0,
        numberOfPurchases: Number(data.numberOfPurchases) || 0,
        totalInvested: Number(data.totalInvested) || 0,
        remainingCash: Number(data.remainingCash) || 0,
        maxDrawdown: Number(data.maxDrawdown) || 0,
      };
      
      setResults(validatedResults);
    } catch (error) {
      console.error('Backtest failed:', error);
      alert('백테스트 실행 중 오류가 발생했습니다.');
    }
  };

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">TQQQ Backtest</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <BacktestForm onSubmit={handleBacktest} />
        </div>
        <div>
          {results && (
            <>
              <BacktestResults results={results} />
              <BacktestChart data={results.chartData} />
            </>
          )}
        </div>
      </div>
      {results && results.tradeHistory && <TradeHistory trades={results.tradeHistory} />}

    </main>
  );
}