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
  mustChangePassword: z.boolean().optional().default(false),
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
  // Flag opcional para forzar cambio de password al primer login.
  // Si está en true, el guard rechaza todo excepto /auth/me, /auth/logout
  // y /auth/change-password.
  mcp: z.boolean().optional(),
});
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export const ChangePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password actual requerida'),
    newPassword: z
      .string()
      .min(8, 'La nueva password debe tener al menos 8 caracteres')
      .max(72, 'Máximo 72 caracteres'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'La nueva password debe ser distinta a la actual',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;
