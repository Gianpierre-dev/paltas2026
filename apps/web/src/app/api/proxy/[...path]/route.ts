// Catch-all que reenvía requests del cliente al backend NestJS.
// Permite que Client Components hagan fetch mismo-origin (cookies httpOnly viajan
// automáticamente) sin exponer JWT_SECRET ni el access token al JavaScript.
//
// La cookie de access se lee acá, se convierte en Bearer header, y se reenvía.
// Si la cookie no existe o el access token es inválido, devolvemos 401 — el cliente
// tiene que refrescar via /api/auth/refresh y reintentar.
import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, API_URL_INTERNAL } from '@/lib/config';

const FORWARD_HEADERS = ['content-type', 'accept', 'user-agent'] as const;

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'Sin sesión' }, { status: 401 });
  }

  const targetUrl = new URL(`${API_URL_INTERNAL}/${path.join('/')}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  for (const h of FORWARD_HEADERS) {
    const v = req.headers.get(h);
    if (v) headers[h] = v;
  }

  const method = req.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text();

  const upstream = await fetch(targetUrl.toString(), {
    method,
    headers,
    body,
    cache: 'no-store',
  });

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const responseBody = await upstream.arrayBuffer();

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { 'content-type': contentType },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path);
}
