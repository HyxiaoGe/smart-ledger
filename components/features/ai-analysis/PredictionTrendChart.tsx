'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar
} from 'recharts';

interface PredictionData {
  predictions: Array<{
    month: string;
    totalAmount: number;
    confidence: number;
    categoryBreakdown: Array<{
      category: string;
      amount: number;
      confidence: number;
    }>;
  }>;
}

interface HistoricalData {
  monthlyData: Array<{
    month: string;
    totalAmount: number;
    transactionCount: number;
  }>;
}

interface PredictionTrendChartProps {
  predictionData: PredictionData;
  historicalData: HistoricalData;
  className?: string;
}

// 类别名称中文翻译
const categoryNames: Record<string, string> = {
  food: '餐饮',
  transport: '交通',
  drink: '饮品',
  daily: '日用品',
  subscription: '订阅服务',
  entertainment: '娱乐',
  medical: '医疗',
  education: '教育',
  rent: '房租',
  other: '其他',
  shopping: '购物',
  utilities: '水电费'
};

// 类别颜色配置
const categoryColors: Record<string, string> = {
  food: '#ef4444',
  transport: '#3b82f6',
  drink: '#10b981',
  daily: '#f59e0b',
  subscription: '#8b5cf6',
  entertainment: '#ec4899',
  medical: '#14b8a6',
  education: '#f97316',
  rent: '#6366f1',
  other: '#6b7280',
  shopping: '#84cc16',
  utilities: '#06b6d4'
};

export function PredictionTrendChart({
  predictionData,
  historicalData,
  className = ''
}: PredictionTrendChartProps) {
  // 合并历史数据和预测数据
  const combinedData = React.useMemo(() => {
    const history = historicalData.monthlyData.slice(-6).map(item => ({
      ...item,
      type: 'historical',
      displayMonth: item.month.slice(5) // 只显示月份
    }));

    const prediction = predictionData.predictions.map(item => ({
      month: item.month,
      totalAmount: item.totalAmount,
      type: 'prediction',
      confidence: item.confidence,
      displayMonth: item.month.slice(5),
      // 计算置信区间
      upperBound: item.totalAmount * (1 + (100 - item.confidence) / 100),
      lowerBound: item.totalAmount * (1 - (100 - item.confidence) / 100)
    }));

    return [...history, ...prediction];
  }, [historicalData, predictionData]);

  // 准备分类数据（堆叠面积图）
  const categoryData = React.useMemo(() => {
    if (!predictionData.predictions.length) return [];

    return predictionData.predictions.map(prediction => {
      const data: any = {
        month: prediction.month.slice(5),
        total: prediction.totalAmount
      };

      // 添加各类别数据
      prediction.categoryBreakdown.forEach(cat => {
        const categoryName = categoryNames[cat.category] || cat.category;
        data[categoryName] = cat.amount;
      });

      return data;
    });
  }, [predictionData]);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPrediction = data.type === 'prediction';

      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-gray-600 dark:text-gray-300">总支出：</span>
              <span className={`font-medium ${isPrediction ? 'text-blue-600' : 'text-gray-900'}`}>
                ¥{data.totalAmount?.toFixed(0) || data.totalAmount?.toFixed(0)}
              </span>
            </p>
            {isPrediction && data.confidence && (
              <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                置信度：{data.confidence}%
              </p>
            )}
            {isPrediction && data.upperBound && data.lowerBound && (
              <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
                <div>预测区间：¥{data.lowerBound.toFixed(0)} - ¥{data.upperBound.toFixed(0)}</div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // 分类数据Tooltip
  const CategoryTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600 dark:text-gray-300">{entry.name}：</span>
                <span className="font-medium">¥{entry.value.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 主要趋势图 */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 dark:border-gray-700 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">支出趋势预测</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="displayMonth"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              tickFormatter={(value) => `¥${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* 置信区间 */}
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeOpacity={0}
              name="预测上限"
            />
            <Area
              type="monotone"
              dataKey="lowerBound"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeOpacity={0}
              name="预测下限"
            />

            {/* 历史数据线 */}
            <Line
              type="monotone"
              dataKey="totalAmount"
              stroke="#6b7280"
              strokeWidth={2}
              dot={{ fill: '#6b7280', r: 4 }}
              name="历史支出"
              connectNulls={false}
            />

            {/* 预测数据线 */}
            <Line
              type="monotone"
              dataKey="totalAmount"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#3b82f6', r: 4 }}
              name="预测支出"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 分类预测图 */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">分类支出预测</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickFormatter={(value) => `¥${value}`}
              />
              <Tooltip content={<CategoryTooltip />} />
              <Legend />

              {/* 动态生成各类别的柱状图 */}
              {Object.keys(categoryNames).map(category => {
                const categoryName = categoryNames[category];
                const color = categoryColors[category];

                // 检查这个类别在数据中是否存在
                const hasData = categoryData.some(item => item[categoryName] > 0);

                if (!hasData) return null;

                return (
                  <Bar
                    key={category}
                    dataKey={categoryName}
                    stackId="a"
                    fill={color}
                    name={categoryName}
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 置信度说明 */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">预测说明</h4>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>• 虚线表示基于历史数据的AI预测结果</li>
          <li>• 浅蓝色区域表示预测的置信区间</li>
          <li>• 置信度越高，预测结果越可靠</li>
          <li>• 分类预测显示了主要支出类别的前景</li>
        </ul>
      </div>
    </div>
  );
}