import { fetchCatalogosForForm } from '@/lib/catalogos';
import { NuevaInspeccionForm } from './_components/nueva-form';

export default async function NuevaInspeccionPage() {
  const catalogos = await fetchCatalogosForForm();

  if (!catalogos) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-red-600">No se pudieron cargar los catálogos.</p>
      </div>
    );
  }

  return <NuevaInspeccionForm catalogos={catalogos} />;
}
