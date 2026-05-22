import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import type { Business } from '../../types';

// Fix leaflet default icon issue with Vite/webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface BusinessMapProps {
  businesses: Business[];
  /** Altura del mapa en px (default 420) */
  height?: number;
  /** Si es un mapa de detalle de un solo negocio */
  single?: boolean;
}

// Centro de San Salvador
const SAN_SALVADOR: [number, number] = [13.6929, -89.2182];

export default function BusinessMap({ businesses, height = 420, single = false }: BusinessMapProps) {
  // Para un solo negocio, centrar en él si tiene coordenadas
  const withCoords = businesses.filter((b) => b.latitude != null && b.longitude != null);

  const center: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].latitude!, withCoords[0].longitude!]
      : SAN_SALVADOR;

  const zoom = single ? 15 : 12;

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withCoords.map((b) => (
          <Marker key={b.id} position={[b.latitude!, b.longitude!]}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-bold text-gray-900 text-sm mb-0.5">{b.name}</p>
                <p className="text-xs text-gray-500 mb-1">{b.address}, {b.city}</p>
                {!single && (
                  <Link
                    to={`/business/${b.id}`}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    Ver detalle →
                  </Link>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
