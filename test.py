import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                            QHBoxLayout, QLabel, QLineEdit, QPushButton, 
                            QFormLayout, QMessageBox)
from PyQt5.QtCore import Qt

class TQQQBacktest:
    def __init__(self, initial_cash, start_date, end_date=None, exchange_rate=1300):
        """
        TQQQ 백테스팅을 위한 클래스 초기화
        
        Parameters:
        initial_cash (float): 초기 투자금액 (원)
        start_date (str): 시작일 (YYYY-MM-DD)
        end_date (str): 종료일 (YYYY-MM-DD), None이면 현재까지
        exchange_rate (float): 달러-원 환율
        """
        self.initial_cash = initial_cash
        self.start_date = start_date
        self.end_date = end_date if end_date else datetime.now().strftime('%Y-%m-%d')
        self.data = None
        self.positions = []
        self.cash = initial_cash
        self.portfolio_value_history = []
        self.exchange_rate = exchange_rate  # 달러-원 환율 추가
        
    def fetch_data(self):
        """TQQQ 데이터 가져오기"""
        tqqq = yf.download('TQQQ', start=self.start_date, end=self.end_date)
        tqqq['DrawDown'] = ((tqqq['Adj Close'].max() - tqqq['Adj Close']) 
                           / tqqq['Adj Close'].max() * 100)
        self.data = tqqq
        return tqqq
    
    def run_infinite_buying_strategy(self, 
                                   initial_investment, 
                                   drop_interval=5, 
                                   multiplier=2, 
                                   sell_recovery=50,
                                   max_steps=10,  # 최대 매수 단계
                                   min_purchase=1000000):  # 최소 매수 금액
        """
        라오어의 무한매수법 백테스팅 실행
        
        Parameters:
        initial_investment (float): 최초 매수금액
        drop_interval (float): 추가 매수 시점의 하락률 (%)
        multiplier (float): 추가 매수시 이전 매수금액 대비 배수
        sell_recovery (float): 매도 시점의 회복률 (%). 예: 50이면 드로우다운이 50% 회복시 매도
        """
        if self.data is None:
            self.fetch_data()
            
        self.positions = []
        self.cash = self.initial_cash
        current_max = float(self.data['Adj Close'].iloc[0])
        last_purchase_drawdown = 0
        self.portfolio_value_history = []
        self.trade_history = []
        
        for date, row in self.data.iterrows():
            price = float(row['Adj Close'])  # 달러 단위
            drawdown = ((current_max - price) / current_max) * 100
            
            # 새로운 고점 갱신
            if price > current_max:
                current_max = price
                last_purchase_drawdown = 0
            
            # 매도 로직: 포지션이 있고 드로우다운이 충분히 회복됐을 때
            positions_to_remove = []
            for i, position in enumerate(self.positions):
                entry_price_usd = position['entry_price_usd']
                entry_drawdown = position['drawdown']
                current_drawdown = ((current_max - price) / current_max) * 100
                
                # 회복률 계산
                recovery = ((entry_drawdown - current_drawdown) / entry_drawdown) * 100 if entry_drawdown > 0 else 0
                current_profit = ((price - entry_price_usd) / entry_price_usd) * 100
                
                # 원래 드로우다운으로부터의 회복률과 함께 수익률도 체크
                if recovery >= sell_recovery or current_profit > 0:  # 회복률 달성 또는 수익 발생 시
                    sell_amount = position['shares'] * price
                    self.cash += sell_amount * self.exchange_rate  # 원화로 변환
                    positions_to_remove.append(i)
                    
                    self.trade_history.append({
                        'date': date,
                        'type': 'SELL',
                        'price_usd': price,
                        'shares': position['shares'],
                        'amount_krw': sell_amount * self.exchange_rate,
                        'amount_usd': sell_amount,
                        'drawdown': position['drawdown'],
                        'reason': f'드로우다운 {recovery:.1f}% 회복',
                        'portfolio_value_krw': self.calculate_portfolio_value(price),
                        'portfolio_value_usd': self.calculate_portfolio_value(price) / self.exchange_rate,
                        'remaining_cash': self.cash
                    })
            
            # 매도된 포지션 제거
            for i in sorted(positions_to_remove, reverse=True):
                self.positions.pop(i)
            
            # 매수 로직
            current_step = int(drawdown // drop_interval)
            if current_step >= 1 and current_step <= max_steps:
                purchase_amount_krw = initial_investment * (multiplier ** (current_step - 1))
                purchase_amount_krw = max(purchase_amount_krw, min_purchase)
                
                # 현금 보유량에 따른 조절
                if purchase_amount_krw > self.cash:
                    purchase_amount_krw = self.cash if self.cash >= min_purchase else 0
                    
                if purchase_amount_krw > 0:
                    # 달러로 변환하여 주식 수량 계산
                    purchase_amount_usd = purchase_amount_krw / self.exchange_rate
                    shares = purchase_amount_usd / price
                    
                    self.positions.append({
                        'date': date,
                        'price_usd': price,
                        'entry_price_usd': price,
                        'shares': shares,
                        'amount_krw': purchase_amount_krw,
                        'amount_usd': purchase_amount_usd,
                        'drawdown': drawdown
                    })
                    self.cash -= purchase_amount_krw
                    
                    self.trade_history.append({
                        'date': date,
                        'type': 'BUY',
                        'price_usd': price,
                        'shares': shares,
                        'amount_krw': purchase_amount_krw,
                        'amount_usd': purchase_amount_usd,
                        'drawdown': drawdown,
                        'reason': f'고점대비 {drawdown:.1f}% 하락 (매수단계: {current_step})',
                        'portfolio_value_krw': self.calculate_portfolio_value(price),
                        'portfolio_value_usd': self.calculate_portfolio_value(price) / self.exchange_rate,
                        'remaining_cash': self.cash
                    })
            
            # 포트폴리오 가치 계산
            total_shares = sum(pos['shares'] for pos in self.positions)
            portfolio_value_usd = total_shares * price  # USD 기준 주식 가치
            portfolio_value_krw = (portfolio_value_usd * self.exchange_rate) + self.cash  # 원화로 변환 후 현금 추가
            
            # trade_history에 포트폴리오 정보 추가
            if self.trade_history and self.trade_history[-1]['date'] == date:
                self.trade_history[-1].update({
                    'portfolio_value_krw': portfolio_value_krw,
                    'portfolio_value_usd': portfolio_value_usd,  # USD 기준 주식 가치만
                    'remaining_cash': self.cash  # 화 기준 현금
                })
            
            # 포트폴리오 가치 기록
            self.portfolio_value_history.append({
                'date': date,
                'value_krw': portfolio_value_krw,  # 원화 기준 총 가치 (주식 + 현금)
                'value_usd': portfolio_value_usd,  # USD 기준 주식 가치만
                'price': price,
                'drawdown': drawdown,
                'total_shares': total_shares,
                'cash': self.cash  # 원화 기준 현금
            })
    
    def plot_results(self):
        """백테스팅 결과 시각화"""
        if not self.portfolio_value_history:
            return
            
        df = pd.DataFrame(self.portfolio_value_history)
        df.set_index('date', inplace=True)
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(15, 10))
        
        # 포트폴리오 가치와 TQQQ 가격 비교
        ax1.plot(df.index, df['value_krw'], label='Portfolio Value (KRW)', color='blue')
        # Buy & Hold 전략의 가치를 원화로 변환
        buy_hold_value = df['price'] * (self.initial_cash / (df['price'].iloc[0] * self.exchange_rate)) * self.exchange_rate
        ax1.plot(df.index, buy_hold_value, label='TQQQ Buy & Hold (KRW)', color='red')
        ax1.set_title('Portfolio Value vs TQQQ Buy & Hold')
        ax1.legend()
        ax1.grid(True)
        
        # 매수/매도 시점 표시
        buy_trades = [t for t in self.trade_history if t['type'] == 'BUY']
        sell_trades = [t for t in self.trade_history if t['type'] == 'SELL']
        
        if buy_trades:
            buy_dates = [t['date'] for t in buy_trades]
            buy_values = [t['amount_krw'] for t in buy_trades]  # 원화 기준 거래금액 사용
            ax1.scatter(buy_dates, buy_values, color='green', 
                       label='Buy Points', zorder=5, marker='^')
        
        if sell_trades:
            sell_dates = [t['date'] for t in sell_trades]
            sell_values = [t['amount_krw'] for t in sell_trades]  # 원화 기준 거래금액 사용
            ax1.scatter(sell_dates, sell_values, color='red',
                       label='Sell Points', zorder=5, marker='v')
        
        # 드로우다운 차트
        ax2.plot(df.index, df['drawdown'], color='red', label='Drawdown %')
        ax2.set_title('TQQQ Drawdown (%)')
        ax2.grid(True)
        ax2.invert_yaxis()
        
        plt.tight_layout()
        plt.show()
        
    def get_summary(self):
        """백테스팅 결과 요약"""
        if not self.portfolio_value_history:
            return None
            
        initial_value = self.portfolio_value_history[0]['value_krw']  # 원화 기준
        final_value = self.portfolio_value_history[-1]['value_krw']   # 원화 기준
        total_return = ((final_value - initial_value) / initial_value) * 100
        
        total_invested = sum(pos['amount_krw'] for pos in self.positions)
        remaining_cash = self.cash
        
        trade_summary = pd.DataFrame(self.trade_history)
        if not trade_summary.empty:
            trade_summary['date'] = pd.to_datetime(trade_summary['date'])
            trade_summary = trade_summary.sort_values('date')
        
        return {
            'Initial Investment': self.initial_cash,
            'Final Portfolio Value': final_value,
            'Total Return (%)': total_return,
            'Number of Purchases': len(self.positions),
            'Total Invested': total_invested,
            'Remaining Cash': remaining_cash,
            'Max Drawdown (%)': max(pos['drawdown'] for pos in self.portfolio_value_history),
            'Trade History': trade_summary if not trade_summary.empty else None
        }
    
    def save_trade_history_to_csv(self, filename='trade_history.csv'):
        """거래 기록을 CSV 파일로 저장"""
        if not self.trade_history:
            print("거래 기록이 없습니다.")
            return
            
        df = pd.DataFrame(self.trade_history)
        
        # 날짜 형식 변환
        df['date'] = pd.to_datetime(df['date'])
        
        # 컬럼명 한글화
        column_mapping = {
            'date': '거래일자',
            'type': '거래유형',
            'price_usd': '거래가격(USD)',
            'shares': '주식수량',
            'amount_krw': '거래금액(KRW)',
            'amount_usd': '거래금액(USD)',
            'drawdown': '드로우다운(%)',
            'reason': '거래사유',
            'portfolio_value_krw': '포트폴리오 가치(KRW)',
            'portfolio_value_usd': '포트폴리오 가치(USD)',
            'remaining_cash': '현금잔고(KRW)',
            'cash_krw': '현금잔고(KRW)',
            'cash_usd': '현금잔고(USD)',
            'stock_value_krw': '주식가치(KRW)',
            'stock_value_usd': '주식가치(USD)',
            'total_value_krw': '총자산(KRW)',
            'total_value_usd': '총자산(USD)'
        }
        
        df = df.rename(columns=column_mapping)
        
        # CSV 파일로 저장
        df.to_csv(filename, index=False, encoding='utf-8-sig')
        print(f"거래 기록이 {filename}에 저장되었습니다.")
    
    def calculate_portfolio_values(self, current_price):
        """현재 포트폴리오의 모든 가치 계산"""
        # 주식 가치 계산
        total_shares = sum(pos['shares'] for pos in self.positions)
        stock_value_usd = total_shares * current_price
        stock_value_krw = stock_value_usd * self.exchange_rate
        
        # 현금 가치 계산
        cash_krw = self.cash
        cash_usd = self.cash / self.exchange_rate
        
        # 총 자산 가치 계산
        total_value_krw = cash_krw + stock_value_krw
        total_value_usd = cash_usd + stock_value_usd
        
        return {
            'cash_krw': cash_krw,
            'cash_usd': cash_usd,
            'stock_value_krw': stock_value_krw,
            'stock_value_usd': stock_value_usd,
            'total_value_krw': total_value_krw,
            'total_value_usd': total_value_usd
        }
    
    def calculate_portfolio_value(self, current_price):
        """현재 포트폴리오 총 가치 계산 (원화)"""
        positions_value = sum(pos['shares'] * current_price * self.exchange_rate 
                            for pos in self.positions)
        return positions_value + self.cash

class BacktestUI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle('TQQQ Backtest')
        self.setGeometry(100, 100, 400, 300)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        
        form_layout = QFormLayout()
        
        # 입력 필드들을 천 단위 구분자와 함께 초기화
        self.initial_cash = QLineEdit(format(100000000, ','))
        self.start_date = QLineEdit('2024-02-01')
        self.initial_investment = QLineEdit(format(1000000, ','))
        self.drop_interval = QLineEdit('5')
        self.multiplier = QLineEdit('2')
        self.sell_recovery = QLineEdit('50')
        
        # 숫자 입력 필드에 대해 천 단위 구분자 이벤트 연결
        self.initial_cash.textChanged.connect(lambda: self.format_number(self.initial_cash))
        self.initial_investment.textChanged.connect(lambda: self.format_number(self.initial_investment))
        
        form_layout.addRow('초 자금 (원):', self.initial_cash)
        form_layout.addRow('시작일 (YYYY-MM-DD):', self.start_date)
        form_layout.addRow('첫 매수금액 (원):', self.initial_investment)
        form_layout.addRow('하락 간격 (%):', self.drop_interval)
        form_layout.addRow('매수 배수:', self.multiplier)
        form_layout.addRow('매도 회복률 (%):', self.sell_recovery)
        
        layout.addLayout(form_layout)
        
        run_button = QPushButton('백테스트 실행')
        run_button.clicked.connect(self.run_backtest)
        layout.addWidget(run_button)

    def format_number(self, line_edit):
        """천 단위 구분자 포맷팅"""
        try:
            # 현재 커서 위치 저장
            cursor_pos = line_edit.cursorPosition()
            
            # 콤마 제거 후 숫자만 추출
            text = line_edit.text().replace(',', '')
            if text:
                number = int(text)
                formatted = format(number, ',')
                
                # 이전 텍스트 길이와 새로운 텍스트 길이의 차이 계산
                old_length = len(line_edit.text())
                new_length = len(formatted)
                
                line_edit.setText(formatted)
                
                # 커서 위치 조정
                if cursor_pos < old_length:
                    diff = new_length - old_length
                    new_pos = cursor_pos + diff
                    line_edit.setCursorPosition(min(new_pos, new_length))
                
        except ValueError:
            pass

    def run_backtest(self):
        try:
            # 콤마 제거 후 숫자 변환
            initial_cash = float(self.initial_cash.text().replace(',', ''))
            start_date = self.start_date.text()
            initial_investment = float(self.initial_investment.text().replace(',', ''))
            drop_interval = float(self.drop_interval.text())
            multiplier = float(self.multiplier.text())
            sell_recovery = float(self.sell_recovery.text())
            
            # 백테스트 실행
            backtest = TQQQBacktest(initial_cash, start_date)
            backtest.run_infinite_buying_strategy(
                initial_investment=initial_investment,
                drop_interval=drop_interval,
                multiplier=multiplier,
                sell_recovery=sell_recovery
            )
            
            # 결과 출력
            summary = backtest.get_summary()
            result_text = "\n=== 백테스트 결과 ===\n"
            for key, value in summary.items():
                if key != 'Trade History':
                    if isinstance(value, float):
                        result_text += f"{key}: {value}\n"
                    else:
                        result_text += f"{key}: {value}\n"
            
            # CSV 파일로 거래 기록 저장
            backtest.save_trade_history_to_csv()
            
            QMessageBox.information(self, "백테스트 결과", result_text)
            
            # 그래프 표시
            backtest.plot_results()
            
        except Exception as e:
            QMessageBox.critical(self, "에러", f"백테스트 실행 중 오류 발생:\n{str(e)}")

def run_ui():
    app = QApplication([])
    window = BacktestUI()
    window.show()
    app.exec_()

if __name__ == "__main__":
    run_ui()