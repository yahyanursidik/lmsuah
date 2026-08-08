import { z } from 'zod';
import { ValidationError } from '../middleware/validation.js';

export async function validateBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      throw new ValidationError('Format data tidak valid', err.errors);
    }
    throw new ValidationError('Gagal membaca body JSON');
  }
}

export { ValidationError };
