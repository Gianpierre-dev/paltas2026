import { z } from 'zod';
import { Rol } from '../constants';

export const LoginInputSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  password: z.string().min(8, 'Password debe tener al menos 8 caracteres'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  usuario: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    nombre: z.string(),
    apellido: z.string(),
    rol: z.enum([Rol.ADMIN, Rol.INSPECTOR]),
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  rol: z.enum([Rol.ADMIN, Rol.INSPECTOR]),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
