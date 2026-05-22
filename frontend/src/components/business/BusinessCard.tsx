import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Clock } from 'lucide-react';
import type { Business, BusinessHours } from '../../types';

interface Props {
  business: Business;
}

const PRICE_COLORS = ['', 'text-green-600', 'text-green-600', 'text-amber-600', 'text-red-500'];

/** Devuelve el estado de apertura del negocio basado en sus horarios.
 *  day_of_week en BD: 0=Lunes … 6=Domingo (ISO).
 *  JS Date.getDay(): 0=Domingo, 1=Lunes … 6=Sábado → convertir con (jsDay+6)%7
 */
function getOpenStatus(hours: BusinessHours[]): { open: boolean; label: string } | null {
  if (!hours || hours.length === 0) return null;

  // Hora actual en zona El Salvador (UTC-6)
  const now = new Date();
  const svTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/El_Salvador' }));
  const jsDay = svTime.getDay(); // 0=Dom … 6=Sab
  const todayISO = (jsDay + 6) % 7; // 0=Lun … 6=Dom

  const todayHours = hours.find((h) => h.day_of_week === todayISO);
  if (!todayHours) return null;

  if (todayHours.is_closed) return { open: false, label: 'Cerrado hoy' };

  const [openH, openM] = todayHours.open_time.split(':').map(Number);
  const [closeH, closeM] = todayHours.close_time.split(':').map(Number);
  const nowMinutes = svTime.getHours() * 60 + svTime.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  let isOpen: boolean;
  if (closeMinutes < openMinutes) {
    // Cruza medianoche (ej. 17:00–02:00)
    isOpen = nowMinutes >= openMinutes || nowMinutes < closeMinutes;
  } else {
    isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }

  // Si cierra en menos de 60 minutos, mostrar aviso
  const minutesUntilClose = closeMinutes - nowMinutes;
  if (isOpen && minutesUntilClose > 0 && minutesUntilClose <= 60) {
    return { open: true, label: `Cierra en ${minutesUntilClose} min` };
  }

  return { open: isOpen, label: isOpen ? 'Abierto' : 'Cerrado' };
}

export default function BusinessCard({ business }: Props) {
  const priceLabel = business.price_level ? '$'.repeat(business.price_level) : null;
  const openStatus = getOpenStatus(business.hours);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <Link
      to={`/business/${business.id}`}
      className="group block bg-white rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Image */}
      <div className="h-44 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 relative overflow-hidden">
        {business.photo_url ? (
          <>
            {/* Skeleton mientras carga */}
            {!imgLoaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
            <img
              src={business.photo_url}
              alt={business.name}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-indigo-200" />
          </div>
        )}

        {/* Rating badge */}
        {business.review_count > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            {business.avg_rating.toFixed(1)}
          </div>
        )}

        {/* Verified badge */}
        {business.is_verified && (
          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
            Verificado
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base group-hover:text-indigo-700 transition-colors leading-snug">
          {business.name}
        </h3>

        {/* Categories + price */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {business.categories.slice(0, 2).map((c) => (
            <span key={c.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              {c.name}
            </span>
          ))}
          {priceLabel && (
            <span className={`text-xs font-semibold ${PRICE_COLORS[business.price_level || 1]}`}>
              {priceLabel}
            </span>
          )}
        </div>

        {/* Reviews count */}
        <div className="flex items-center gap-1 mt-2.5">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${
                  s <= Math.round(business.avg_rating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-200 fill-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-0.5">
            ({business.review_count} resena{business.review_count !== 1 ? 's' : ''})
          </span>
        </div>

        {/* Location + estado abierto/cerrado */}
        <div className="flex items-center justify-between mt-2.5 gap-2">
          <p className="text-xs text-gray-400 flex items-center gap-1 truncate min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{business.address}, {business.city}</span>
          </p>
          {openStatus && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                openStatus.open
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              <Clock className="w-3 h-3" />
              {openStatus.label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
