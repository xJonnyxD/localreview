import { lazy, Suspense } from 'react';
import { Map } from 'lucide-react';

const BusinessMap = lazy(() => import('./BusinessMap'));

interface Props {
  businesses: import('../../types').Business[];
  height?: number;
  single?: boolean;
}

function MapSkeleton({ height = 420 }: { height?: number }) {
  return (
    <div
      style={{ height }}
      className="w-full rounded-2xl bg-gray-100 border border-gray-200 flex flex-col items-center justify-center gap-2 animate-pulse"
    >
      <Map className="w-8 h-8 text-gray-300" />
      <p className="text-sm text-gray-400">Cargando mapa...</p>
    </div>
  );
}

export default function BusinessMapLazy({ businesses, height = 420, single = false }: Props) {
  return (
    <Suspense fallback={<MapSkeleton height={height} />}>
      <BusinessMap businesses={businesses} height={height} single={single} />
    </Suspense>
  );
}
