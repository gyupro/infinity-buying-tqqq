'use client';

interface BacktestResultsProps {
  results: {
    initialInvestment: number;
    finalPortfolioValue: number;
    totalReturn: number;
    numberOfPurchases: number;
    totalInvested: number;
    remainingCash: number;
    maxDrawdown: number;
  };
}

export default function BacktestResults({ results }: BacktestResultsProps) {
  if (!results || typeof results.initialInvestment === 'undefined') {
    return <div>Loading results...</div>;
  }

  // 포트폴리오 가치 (주식 가치)
  const portfolioValue = results.finalPortfolioValue - results.remainingCash;
  // 총 자산 (포트폴리오 가치 + 현금잔고)
  const totalAssets = results.finalPortfolioValue;

  const portfolioPercentage = ((portfolioValue / results.initialInvestment) * 100).toFixed(1);
  const cashPercentage = ((results.remainingCash / results.initialInvestment) * 100).toFixed(1);
  const totalPercentage = ((totalAssets / results.initialInvestment) * 100).toFixed(1);

  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4">
      <h2 className="text-xl font-bold mb-4">백테스트 결과</h2>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>초기 투자금:</span>
          <span>{results.initialInvestment.toLocaleString()}달러</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span>포트폴리오 가치:</span>
          <span className="text-right">{portfolioValue.toLocaleString()}달러</span>
          <span className="text-right text-gray-500">
            ({portfolioPercentage}%)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span>현금잔고:</span>
          <span className="text-right">{results.remainingCash.toLocaleString()}달러</span>
          <span className="text-right text-gray-500">
            ({cashPercentage}%)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 font-bold border-t border-gray-300 pt-2">
          <span>총 자산:</span>
          <span className="text-right">{totalAssets.toLocaleString()}달러</span>
          <span className="text-right">{totalPercentage}%</span>
        </div>
        <div className="flex justify-between">
          <span>총 수익률:</span>
          <span>{Math.round(results.totalReturn)}%</span>
        </div>
        <div className="flex justify-between">
          <span>총 매수 횟수:</span>
          <span>{results.numberOfPurchases}회</span>
        </div>
        <div className="flex justify-between">
          <span>총 투자금액:</span>
          <span>{results.totalInvested.toLocaleString()}달러</span>
        </div>
        <div className="flex justify-between">
          <span>최대 드로우다운:</span>
          <span>{Math.round(results.maxDrawdown)}%</span>
        </div>
      </div>
    </div>
  );
}