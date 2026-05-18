// Fetcher de catálogos para el form de inspección.
// Server-side — usa el token de la cookie y trae todos los catálogos en paralelo.
import type { FamiliaDefecto } from '@paltas2026/shared';
import { api } from './api';
import { getServerToken } from './session';

export interface CatalogoSimple {
  id: string;
  nombre: string;
}

export interface CatalogoEmbalaje {
  id: string;
  codigo: string;
  descripcion: string;
  marca: string;
  pesoKg: string | number;
}

export interface CatalogoTipoDefecto {
  id: string;
  nombre: string;
  familia: FamiliaDefecto;
  orden: number;
}

export interface CatalogosForForm {
  fundos: CatalogoSimple[];
  variedades: CatalogoSimple[];
  clientes: CatalogoSimple[];
  destinos: CatalogoSimple[];
  tiposEmbalaje: CatalogoEmbalaje[];
  tiposDefecto: CatalogoTipoDefecto[];
}

export async function fetchCatalogosForForm(): Promise<CatalogosForForm | null> {
  const token = await getServerToken();
  if (!token) return null;

  try {
    const [fundos, variedades, clientes, destinos, tiposEmbalaje, tiposDefecto] =
      await Promise.all([
        api<CatalogoSimple[]>('/fundos', { accessToken: token }),
        api<CatalogoSimple[]>('/variedades', { accessToken: token }),
        api<CatalogoSimple[]>('/clientes', { accessToken: token }),
        api<CatalogoSimple[]>('/destinos', { accessToken: token }),
        api<CatalogoEmbalaje[]>('/tipos-embalaje', { accessToken: token }),
        api<CatalogoTipoDefecto[]>('/tipos-defecto', { accessToken: token }),
      ]);
    return { fundos, variedades, clientes, destinos, tiposEmbalaje, tiposDefecto };
  } catch {
    return null;
  }
}
