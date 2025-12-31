import { apiClient } from '../client';

export const holidaysApi = {
  sync(year: number): Promise<{ success: boolean; year: number; count: number }> {
    return apiClient.post<{ success: boolean; year: number; count: number }>(
      `/api/holidays/sync?year=${year}`
    );
  }
};
