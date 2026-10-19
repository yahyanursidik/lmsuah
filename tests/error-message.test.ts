import { describe, expect, it } from 'vitest';
import { getErrorMessage } from '../src/lib/error-message';

describe('Typed error messages', () => {
  it('accepts native errors and Refine HttpError objects', () => {
    expect(getErrorMessage(new Error('Tidak tersedia'), 'Fallback')).toBe('Tidak tersedia');
    expect(getErrorMessage({ message: 'Tidak diizinkan', statusCode: 403 }, 'Fallback')).toBe('Tidak diizinkan');
  });
  it.each([null, undefined, 'raw failure', 42, {}, { message: '' }, { message: '  ' }, { message: 3 }])('uses a safe fallback for %j', error => {
    expect(getErrorMessage(error, 'Coba lagi')).toBe('Coba lagi');
  });
});
