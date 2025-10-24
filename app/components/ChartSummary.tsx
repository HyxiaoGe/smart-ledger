'use client';

import React from 'react';

type ChartSummaryProps = {
  trend: Array<{ name: string; expense: number }>;
  pieMonth: Array<{ name: string; value: number }>;
  pieRange: Array<{ name: string; value: number }>;
  currency: string;
};

export function ChartSummary({ trend, pieMonth, pieRange, currency }: ChartSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 text-sm text-muted-foreground">
      <div className="rounded-lg border bg-white p-4">
        <div className="text-xs uppercase text-gray-500">���Ƶ���</div>
        <div className="mt-2 text-2xl font-semibold text-gray-900">{trend.length}</div>
        <p className="mt-1 text-xs">ϵͳ��δ����ͼ����չʾ��ǰ���ݵĻ���ͳ�ơ�</p>
      </div>
      <div className="rounded-lg border bg-white p-4">
        <div className="text-xs uppercase text-gray-500">�¶ȷ�����</div>
        <div className="mt-2 text-2xl font-semibold text-gray-900">{pieMonth.length}</div>
        <p className="mt-1 text-xs">
          {pieMonth.length > 0 ? '�����Ѽ��أ������ں������ӻ���' : '���޿��ӻ����ݡ�'}
        </p>
      </div>
      <div className="rounded-lg border bg-white p-4">
        <div className="text-xs uppercase text-gray-500">��ǰ���������</div>
        <div className="mt-2 text-2xl font-semibold text-gray-900">{pieRange.length}</div>
        <p className="mt-1 text-xs">���֣�{currency}</p>
      </div>
    </div>
  );
}
