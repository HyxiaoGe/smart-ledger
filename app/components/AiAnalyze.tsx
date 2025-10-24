"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

export function AiAnalyzeButton({ currency, month }: { currency: string; month: string }) {
  // TODO: implement AI analyze action once API is finalized
  const handleAnalyze = () => {
    console.warn('AI analyze is not implemented yet', { currency, month });
  };

  return (
    <Button type="button" variant="outline" onClick={handleAnalyze}>
      ÖÇÄÜ·ÖÎö
    </Button>
  );
}
