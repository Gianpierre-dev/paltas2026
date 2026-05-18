import { z } from 'zod';
import { Rol } from '../constants';

export const LoginInputSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  password: z.string().min(8, 'Password debe tener al menos 8 caracteres'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

const UsuarioPublicoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  nombre: z.string(),
  apellido: z.string(),
  rol: z.enum([Rol.ADMIN, Rol.INSPECTOR]),
});
export type UsuarioPublico = z.infer<typeof UsuarioPublicoSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  usuario: UsuarioPublicoSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshInputSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof RefreshInputSchema>;

export const RefreshResponseSchema = LoginResponseSchema;
export type RefreshResponse = LoginResponse;

export const LogoutInputSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutInput = z.infer<typeof LogoutInputSchema>;

export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  rol: z.enum([Rol.ADMIN, Rol.INSPECTOR]),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
