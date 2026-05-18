// Esta ruta nunca se renderiza: el proxy.ts redirige a /login o /dashboard.
// Pero Next exige una page.tsx en raíz, así que devolvemos null.
export default function Root() {
  return null;
}
