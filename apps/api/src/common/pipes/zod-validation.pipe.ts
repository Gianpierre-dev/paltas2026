import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Pipe genérico que valida el body de un endpoint contra un schema Zod.
 * Uso: @Body(new ZodValidationPipe(LoginInputSchema)) dto: LoginInput
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validación fallida',
        errors: result.error.flatten().fieldErrors,
      });
    }
    return result.data;
  }
}
