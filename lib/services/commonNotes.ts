import { fetchJson } from '@/lib/http';

type ListParams = {
  limit?: number;
  signal?: AbortSignal;
};

type SearchParams = {
  keyword: string;
  limit?: number;
  signal?: AbortSignal;
};

type UpsertParams = {
  content: string;
  amount?: number;
  signal?: AbortSignal;
};

export type CommonNote = {
  id: string;
  content: string;
  usage_count: number;
  last_used: string;
};

type ListResponse = {
  data: CommonNote[];
};

type UpsertResponse = {
  data: CommonNote;
};

const BASE_URL = '/api/common-notes';

export const commonNotesService = {
  async list({ limit = 10, signal }: ListParams = {}) {
    return fetchJson<ListResponse>(`${BASE_URL}?limit=${limit}`, { signal });
  },

  async search({ keyword, limit = 6, signal }: SearchParams) {
    const query = new URLSearchParams({
      search: keyword,
      limit: String(limit)
    });
    return fetchJson<ListResponse>(`${BASE_URL}?${query.toString()}`, { signal });
  },

  async upsert({ content, amount, signal }: UpsertParams) {
    return fetchJson<UpsertResponse>(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({ content, amount }),
      signal
    });
  }
};
