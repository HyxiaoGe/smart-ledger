/* eslint-disable */
import { notifyError } from './notifications';

const DEFAULT_TIMEOUT = 10000;

export class HttpError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type FetchJsonOptions = RequestInit & {
  timeout?: number;
};

type ErrorHandler = (
  error: Error,
  context: {
    input: RequestInfo | URL;
    options: FetchJsonOptions | undefined;
  }
) => void;

let errorHandler: ErrorHandler | null = null;

export function setHttpErrorHandler(handler: ErrorHandler | null) {
  errorHandler = handler;
}

function defaultHttpErrorHandler(
  error: Error,
  context: { input: RequestInfo | URL; options: FetchJsonOptions }
) {
  notifyError(error.message, context);
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  { timeout = DEFAULT_TIMEOUT, headers, ...init }: FetchJsonOptions = {}
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(input, {
      credentials: 'same-origin',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: init.signal ?? controller.signal
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json().catch(() => undefined) : undefined;

    if (!response.ok) {
      throw new HttpError(
        payload?.message || payload?.error || response.statusText,
        response.status,
        payload
      );
    }

    return payload as T;
  } catch (error) {
    let handled: Error;
    if ((error as Error).name === 'AbortError') {
      handled = new HttpError('Request timed out', 408, null);
    } else if (error instanceof Error) {
      handled = error;
    } else {
      handled = new Error('Unknown fetch error');
    }

    const contextOptions: FetchJsonOptions = {
      timeout,
      headers,
      ...init
    };

    if ('signal' in contextOptions) {
      delete (contextOptions as any).signal;
    }

    const context = { input, options: contextOptions };

    if (errorHandler) {
      errorHandler(handled, context);
    } else {
      defaultHttpErrorHandler(handled, context);
    }

    throw handled;
  } finally {
    clearTimeout(timer);
  }
}
