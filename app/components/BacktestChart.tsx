'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChartData {
  dates: string[];
  portfolioValues: number[];
  buyHoldValues: number[];
  tqqqPrices: number[];
  drawdowns: number[];
  portfolioDrawdowns: number[];
}

interface BacktestChartProps {
  data: ChartData;
}

export default function BacktestChart({ data }: BacktestChartProps) {
  const normalizeData = (values: number[]) => {
    const initialValue = values[0];
    return values.map(value => (value / initialValue) * 100);
  };

  const portfolioData = {
    labels: data.dates,
    datasets: [
      {
        label: '포트폴리오 가치',
        data: normalizeData(data.portfolioValues),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Buy & Hold',
        data: normalizeData(data.buyHoldValues),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'category' as const,
        time: {
          displayFormats: {
            day: 'YYYY-MM-DD'
          }
        },
        ticks: {
          callback: function(value: any) {
            return data.dates[value]?.split('T')[0];  // T 이전의 날짜 부분만 표시
          }
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="h-[300px]">
        <Line
          data={portfolioData}
          options={{
            ...commonOptions,
            plugins: {
              title: {
                display: true,
                text: '상대 수익률 비교 (시작점: 100)',
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    return `${context.dataset.label}: ${Math.round(context.parsed.y)}%`;
                  }
                }
              }
            },
            scales: {
              ...commonOptions.scales,
              y: {
                ticks: {
                  callback: (value) => `${value}%`
                }
              }
            }
          }}
        />
      </div>
      <div className="h-[300px]">
        <Line
          data={{
            labels: data.dates,
            datasets: [{
              label: 'TQQQ 가격',
              data: data.tqqqPrices,
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            }]
          }}
          options={{
            ...commonOptions,
            plugins: {
              title: {
                display: true,
                text: 'TQQQ 가격',
              },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                  }
                }
              }
            },
            scales: {
              ...commonOptions.scales,
              y: {
                ticks: {
                  callback: (value) => `$${value}`,
                },
                afterDataLimits: (scale) => {
                  // 첫 번째와 마지막 데이터 포인트에 대한 레이블 추가
                  const ctx = scale.chart.ctx;
                  const firstPrice = data.tqqqPrices[0];
                  const lastPrice = data.tqqqPrices[data.tqqqPrices.length - 1];
                  
                  ctx.save();
                  ctx.fillStyle = 'rgb(75, 192, 192)';
                  ctx.font = '12px Arial';
                  
                  // 시작 가격 표시
                  ctx.fillText(`시작: $${firstPrice.toFixed(2)}`, 10, 20);
                  
                  // 종료 가격 표시
                  const text = `종료: $${lastPrice.toFixed(2)}`;
                  const textWidth = ctx.measureText(text).width;
                  ctx.fillText(text, scale.chart.width - textWidth - 10, 20);
                  
                  ctx.restore();
                }
              }
            }
          }}
        />
      </div>
      <div className="h-[300px]">
        <Line
          data={{
            labels: data.dates,
            datasets: [
              {
                label: '포트폴리오 드로우다운 (%)',
                data: data.portfolioDrawdowns,
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
              },
              {
                label: 'TQQQ 드로우다운 (%)',
                data: data.drawdowns,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
              }
            ]
          }}
          options={{
            ...commonOptions,
            plugins: {
              title: {
                display: true,
                text: '드로우다운 (%) 비교',
              },
            },
            scales: {
              ...commonOptions.scales,
              y: {
                reverse: true,
              },
            },
          }}
        />
      </div>
    </div>
  );
}