import { z } from 'zod';
import { Rol } from '../constants';

const ROL_VALUES = [Rol.ADMIN, Rol.INSPECTOR] as const;

// Crear usuario — el server genera la password temporal y la devuelve UNA sola vez.
export const CreateUsuarioInputSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  nombre: z.string().trim().min(1, 'Nombre requerido').max(50),
  apellido: z.string().trim().min(1, 'Apellido requerido').max(50),
  rol: z.enum(ROL_VALUES).default(Rol.INSPECTOR),
});
export type CreateUsuarioInput = z.infer<typeof CreateUsuarioInputSchema>;

// Respuesta de creación: incluye la password TEMPORAL en plaintext.
// El frontend la muestra al admin una sola vez (show-once).
export const CreateUsuarioResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  nombre: z.string(),
  apellido: z.string(),
  rol: z.enum(ROL_VALUES),
  temporaryPassword: z.string(),
});
export type CreateUsuarioResponse = z.infer<typeof CreateUsuarioResponseSchema>;

// Editar usuario — campos no sensibles. La password se cambia con /reset-password.
export const UpdateUsuarioInputSchema = z.object({
  nombre: z.string().trim().min(1).max(50).optional(),
  apellido: z.string().trim().min(1).max(50).optional(),
  rol: z.enum(ROL_VALUES).optional(),
  activo: z.boolean().optional(),
});
export type UpdateUsuarioInput = z.infer<typeof UpdateUsuarioInputSchema>;

// Respuesta de reset-password — mismo show-once.
export const ResetPasswordResponseSchema = z.object({
  id: z.string().uuid(),
  temporaryPassword: z.string(),
});
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;

// Listado: usuario público + datos administrativos (activo, ultimoLogin).
export const UsuarioAdminSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  nombre: z.string(),
  apellido: z.string(),
  rol: z.enum(ROL_VALUES),
  activo: z.boolean(),
  mustChangePassword: z.boolean(),
  ultimoLogin: z.string().nullable(),
  createdAt: z.string(),
});
export type UsuarioAdmin = z.infer<typeof UsuarioAdminSchema>;
