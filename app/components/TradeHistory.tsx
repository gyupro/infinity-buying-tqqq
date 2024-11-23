interface Trade {
  date: string;
  type: 'BUY' | 'SELL' | 'SKIP';
  priceUsd: number;
  shares: number;
  sharesValue: number;
  amountUsd: number;
  drawdown: number;
  reason?: string;
  portfolioValue: number;
  remainingCash: number;
  totalAssets: number;
  holdings: number;
}

interface TradeHistoryProps {
  trades: Trade[];
}

export default function TradeHistory({ trades }: TradeHistoryProps) {
  if (!trades || trades.length === 0) {
    return null;
  }

  const formatNumber = (num: number | undefined, decimals: number = 2): string => {
    if (num === undefined || isNaN(num)) return '-';
    return num.toFixed(decimals);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">거래 내역</h2>
      <div className="relative overflow-x-auto max-h-[600px]">
        <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">거래일자</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">거래유형</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">거래가격(USD)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">주식수량</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">거래금액(USD)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">드로우다운(%)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">거래사유</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">보유수량</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">주식평가금액(USD)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">현금잔고(USD)</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">총 자산(USD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trades.map((trade, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatDate(trade.date)}
                </td>
                <td className={`px-4 py-3 text-sm ${
                  trade.type === 'BUY' 
                    ? 'text-green-600' 
                    : trade.type === 'SELL' 
                      ? 'text-red-600' 
                      : 'text-gray-600'
                }`}>
                  {trade.type === 'BUY' 
                    ? '매수' 
                    : trade.type === 'SELL' 
                      ? '매도' 
                      : '스킵'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">
                  {formatNumber(trade.priceUsd)}
                </td>
                <td className="px-1 py-3 text-sm text-right text-gray-900">
                  {formatNumber(trade.shares, 4)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">
                  {formatNumber(trade.amountUsd)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-600">
                  {formatNumber(trade.drawdown)}%
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{trade.reason || '-'}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">
                  {formatNumber(trade.holdings, 4)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">
                  {formatNumber(trade.sharesValue)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">
                  {formatNumber(trade.remainingCash)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900">
                  {formatNumber(trade.totalAssets)}
                </td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 