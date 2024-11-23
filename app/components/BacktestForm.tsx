'use client';

import { useState } from 'react';

interface BacktestFormProps {
  onSubmit: (formData: any) => void;
}

export default function BacktestForm({ onSubmit }: BacktestFormProps) {
  const [formData, setFormData] = useState({
    initialCash: 100000,
    startDate: '2024-02-01',
    initialInvestment: 1000,
    dropInterval: 5,
    multiplier: 2,
    sellRecovery: 50,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const formatNumber = (value: string) => {
    const number = value.replace(/[^\d]/g, '');
    return number ? Number(number).toLocaleString() : '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'initialCash' || name === 'initialInvestment') {
      setFormData(prev => ({
        ...prev,
        [name]: Number(value.replace(/[^\d]/g, '')),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">초기 자금 (달러)</label>
        <input
          type="text"
          name="initialCash"
          value={formData.initialCash.toLocaleString()}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">시작일</label>
        <input
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">첫 매수금액 (달러)</label>
        <input
          type="text"
          name="initialInvestment"
          value={formData.initialInvestment.toLocaleString()}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">하락 간격 (%)</label>
        <input
          type="number"
          name="dropInterval"
          value={formData.dropInterval}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">매수 배수</label>
        <input
          type="number"
          name="multiplier"
          value={formData.multiplier}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">매도 회복률 (%)</label>
        <input
          type="number"
          name="sellRecovery"
          value={formData.sellRecovery}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
      >
        백테스트 실행
      </button>
    </form>
  );
} 