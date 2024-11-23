import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-data?symbol=${symbol}&startDate=${startDate}&endDate=${endDate}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch stock data');
    }

    const result = await response.json();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.json();
    
    if (!formData.startDate) {
      return NextResponse.json(
        { error: 'Start date is required' },
        { status: 400 }
      );
    }

    if (!formData.stopLoss) {
      formData.stopLoss = 25;
    }

    // Yahoo Finance API 직접 호
    const result = await yahooFinance.historical('TQQQ', {
      period1: formData.startDate,  // "YYYY-MM-DD" 형식
      period2: new Date().toISOString().split('T')[0],  // 오늘 날짜
      interval: '1d'
    });
    
    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'No historical data available' },
        { status: 404 }
      );
    }

    // 파이썬 코드의 백테스트 로직 구현
    let cash = Number(formData.initialCash);
    let shares = 0;
    let purchases = 0;
    let currentStep = 0;
    let runningMax = result[39].close;  // 40번째 캔들부터 시작
    let portfolioRunningMax = cash;
    const trades = [];
    const portfolioHistory = [];

    // 처음 39개 캔들의 포트폴리오 히스토리 기록
    for (let i = 1; i < 40; i++) {
      const currentPrice = result[i].close;
      portfolioHistory.push({
        date: result[i].date,
        value: cash,
        price: currentPrice,
        drawdown: 0,
        portfolioDrawdown: 0
      });
    }

    for (let i = 40; i < result.length; i++) {  // 40번째 캔들부터 매매 시작
      const currentPrice = result[i].close;
      const currentPortfolioValue = cash + (shares * currentPrice);
      
      // 최고점 갱신
      runningMax = Math.max(runningMax, currentPrice);
      portfolioRunningMax = Math.max(portfolioRunningMax, currentPortfolioValue);
      
      const currentDrawdown = Math.round(((runningMax - currentPrice) / runningMax) * 100);
      const portfolioDrawdown = Math.round(((portfolioRunningMax - currentPortfolioValue) / portfolioRunningMax) * 100);

      // 매수 로직
      if (currentDrawdown >= currentStep * formData.dropInterval && 
          currentStep < (formData.maxSteps || 10)) {
        const purchaseAmount = Number(formData.initialInvestment) * 
                              Math.pow(formData.multiplier, currentStep);
        
        // 현재 현금이 구매금액보다 적으면 매수하지 않고 다음 기회를 기다림
        if (cash >= purchaseAmount) {
          const newShares = purchaseAmount / currentPrice;
          shares += newShares;
          cash -= purchaseAmount;
          const portfolioValue = cash + (shares * currentPrice);
          
          trades.push({
            date: result[i].date,
            type: 'BUY',
            priceUsd: currentPrice,
            shares: newShares,
            sharesValue: shares * currentPrice,
            amountUsd: purchaseAmount,
            drawdown: currentDrawdown,
            reason: `드로우다운 ${currentDrawdown}% 도달`,
            portfolioValue: Math.round(portfolioValue),
            remainingCash: Math.round(cash),
            totalAssets: Math.round(portfolioValue),
            holdings: shares
          });
          
          currentStep++;
          purchases++;
        }
        // 현금이 부족한 경우 거래 기록에 실패 사유를 남김
        else {
          trades.push({
            date: result[i].date,
            type: 'SKIP',
            priceUsd: currentPrice,
            shares: 0,
            sharesValue: shares * currentPrice,
            amountUsd: 0,
            drawdown: currentDrawdown,
            reason: `현금 부족 (필요: ${Math.round(purchaseAmount)}, 보유: ${Math.round(cash)})`,
            portfolioValue: Math.round(cash + (shares * currentPrice)),
            remainingCash: Math.round(cash),
            totalAssets: Math.round(cash + (shares * currentPrice)),
            holdings: shares
          });
        }
      }

      // 매도 로직
      if (shares > 0) {
        const lastBuyTrade = trades.filter(t => t.type === 'BUY').pop();
        if (lastBuyTrade) {
          const entryDrawdown = lastBuyTrade.drawdown;
          const recovery = Math.round(((entryDrawdown - currentDrawdown) / entryDrawdown) * 100);
          
          if (portfolioDrawdown >= formData.stopLoss) {
            const sharesToSell = shares * 0.25;  // 보유 수량의 1/4만 매도
            const sellAmount = sharesToSell * currentPrice;
            cash += sellAmount;
            shares -= sharesToSell;
            const portfolioValue = cash + (shares * currentPrice);
            
            trades.push({
              date: result[i].date,
              type: 'STOP_LOSS',
              priceUsd: currentPrice,
              shares: sharesToSell,
              sharesValue: shares * currentPrice,
              amountUsd: sellAmount,
              drawdown: currentDrawdown,
              reason: `포트폴리오 드로우다운 ${portfolioDrawdown}% 손절매 (25%)`,
              portfolioValue: Math.round(portfolioValue),
              remainingCash: Math.round(cash),
              totalAssets: Math.round(portfolioValue),
              holdings: shares
            });
            
            // 손절매 후 초기화
            currentStep = 0;
            runningMax = currentPrice;
            portfolioRunningMax = portfolioValue;
          }
          else if (recovery >= formData.sellRecovery) {
            const sellAmount = shares * currentPrice;
            cash += sellAmount;
            const portfolioValue = cash;
            
            trades.push({
              date: result[i].date,
              type: 'SELL',
              priceUsd: currentPrice,
              shares: shares,
              sharesValue: 0,
              amountUsd: sellAmount,
              drawdown: currentDrawdown,
              reason: `드로우다운 ${recovery}% 회복`,
              portfolioValue: Math.round(portfolioValue),
              remainingCash: Math.round(cash),
              totalAssets: Math.round(portfolioValue),
              holdings: 0
            });
            
            shares = 0;
            currentStep = 0;
            runningMax = currentPrice;
          }
        }
      }

      // 포트폴리오 가치 기록
      portfolioHistory.push({
        date: result[i].date,
        value: currentPortfolioValue,
        price: currentPrice,
        drawdown: currentDrawdown,
        portfolioDrawdown: portfolioDrawdown
      });
    }

    const finalPortfolioValue = cash + (shares * result[result.length - 1].close);

    // totalInvested 계산 수정
    const maxInvested = trades.reduce((max, trade) => {
      if (trade.type === 'BUY') {
        const currentInvested = trade.sharesValue + trade.remainingCash;
        return Math.max(max, currentInvested);
      }
      return max;
    }, 0);

    return NextResponse.json({
      initialInvestment: formData.initialCash,
      finalPortfolioValue: Math.round(finalPortfolioValue),
      totalReturn: Math.round(((finalPortfolioValue - formData.initialCash) / formData.initialCash) * 100),
      numberOfPurchases: purchases,
      totalInvested: Math.round(maxInvested),
      remainingCash: Math.round(cash),
      maxDrawdown: Math.max(...portfolioHistory.map(h => h.drawdown)),
      portfolioMaxDrawdown: Math.max(...portfolioHistory.map(h => h.portfolioDrawdown)),
      chartData: {
        dates: portfolioHistory.map(h => h.date),
        portfolioValues: portfolioHistory.map(h => h.value),
        buyHoldValues: portfolioHistory.map(h => h.price * (formData.initialCash / result[0].close)),
        tqqqPrices: portfolioHistory.map(h => h.price),
        drawdowns: portfolioHistory.map(h => h.drawdown),
        portfolioDrawdowns: portfolioHistory.map(h => h.portfolioDrawdown)
      },
      tradeHistory: trades
    });

  } catch (error) {
    console.error('Backtest error:', error);
    return NextResponse.json(
      { error: 'Failed to run backtest' },
      { status: 500 }
    );
  }
}