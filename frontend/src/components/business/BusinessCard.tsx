import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import type { Business } from '../../types';

interface Props {
  business: Business;
}

const PRICE_COLORS = ['', 'text-green-600', 'text-green-600', 'text-amber-600', 'text-red-500'];

export default function BusinessCard({ business }: Props) {
  const priceLabel = business.price_level ? '$'.repeat(business.price_level) : null;

  return (
    <Link
      to={`/business/${business.id}`}
      className="group block bg-white rounded-2xl border border-gray-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Image */}
      <div className="h-44 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 relative overflow-hidden">
        {business.photo_url ? (
          <img
            src={business.photo_url}
            alt={business.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
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

        {/* Location */}
        <p className="text-xs text-gray-400 mt-2.5 flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          {business.address}, {business.city}
        </p>
      </div>
    </Link>
  );
}
