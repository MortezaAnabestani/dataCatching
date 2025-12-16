import { DEFAULT_PAGINATION } from './constants';
import type { PaginationParams } from './types';

// ============================================================================
// Date Utilities
// ============================================================================

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return date;
}

export function getTimeRange(hours: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { start, end };
}

// ============================================================================
// Pagination Utilities
// ============================================================================

export function normalizePagination(params: PaginationParams) {
  const page = Math.max(1, params.page || DEFAULT_PAGINATION.page);
  const limit = Math.min(
    params.limit || DEFAULT_PAGINATION.limit,
    DEFAULT_PAGINATION.maxLimit
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function calculatePagination(total: number, page: number, limit: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================================================
// String Utilities
// ============================================================================

export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width characters
}

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// Array Utilities
// ============================================================================

export function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ============================================================================
// Delay & Retry Utilities
// ============================================================================

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delayMs: number
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await delay(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  throw lastError!;
}

// ============================================================================
// Hash Utilities
// ============================================================================

export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export function generateArticleId(url: string, publishedAt: Date): string {
  return `${simpleHash(url)}-${publishedAt.getTime()}`;
}

// ============================================================================
// Validation Utilities
// ============================================================================

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ============================================================================
// Persian Text Utilities
// ============================================================================

export function isPersian(text: string): boolean {
  const persianRegex = /[\u0600-\u06FF]/;
  return persianRegex.test(text);
}

export function normalizePersianText(text: string): string {
  return text
    .replace(/ي/g, 'ی') // Normalize Arabic Yeh to Persian Yeh
    .replace(/ك/g, 'ک') // Normalize Arabic Kaf to Persian Kaf
    .replace(/\u200c+/g, '\u200c') // Normalize multiple ZWNJ to single
    .trim();
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function formatError(error: unknown): { message: string; code?: string; details?: any } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
    };
  }

  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
  };
}
