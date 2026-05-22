import { useEffect, useState } from 'react';
import { X, Building2, MapPin, Phone, Globe, Clock, DollarSign, Loader2, Save } from 'lucide-react';
import { getBusiness, updateBusiness, getCategories } from '../../api/businesses';
import { toast } from '../../stores/toastStore';
import type { Category } from '../../types';

const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

interface HourEntry {
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
}

interface Props {
  businessId: string;
  businessName: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function EditBusinessModal({ businessId, businessName, onSaved, onClose }: Props) {
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [priceLevel, setPriceLevel] = useState<1 | 2 | 3 | 4>(1);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [hours, setHours] = useState<HourEntry[]>(
    DAYS.map((_, i) => ({ day_of_week: i, is_closed: i >= 6, open_time: '08:00', close_time: '18:00' }))
  );

  useEffect(() => {
    async function load() {
      try {
        const [biz, cats] = await Promise.all([
          getBusiness(businessId),
          getCategories(),
        ]);
        setCategories(cats);
        setName(biz.name);
        setDescription(biz.description || '');
        setAddress(biz.address);
        setCity(biz.city);
        setPhone(biz.phone || '');
        setWebsite(biz.website || '');
        setLat(biz.latitude != null ? String(biz.latitude) : '');
        setLng(biz.longitude != null ? String(biz.longitude) : '');
        setPriceLevel((biz.price_level as 1 | 2 | 3 | 4) || 1);
        setSelectedCategories(biz.categories.map((c) => c.id));
        if (biz.hours.length > 0) {
          const filled = DAYS.map((_, i) => {
            const h = biz.hours.find((x) => x.day_of_week === i);
            return h
              ? { day_of_week: i, is_closed: h.is_closed, open_time: h.open_time, close_time: h.close_time }
              : { day_of_week: i, is_closed: false, open_time: '08:00', close_time: '18:00' };
          });
          setHours(filled);
        }
      } catch {
        toast.error('Error al cargar datos del negocio');
        onClose();
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [businessId]);

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const updateHour = (index: number, field: keyof HourEntry, value: string | boolean) => {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !city.trim()) {
      toast.error('Nombre, direccion y ciudad son obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim() || null,
        website: website.trim() || null,
        price_level: priceLevel,
        category_ids: selectedCategories,
        hours: hours.map((h) => ({
          day_of_week: h.day_of_week,
          is_closed: h.is_closed,
          open_time: h.open_time,
          close_time: h.close_time,
        })),
      };
      if (lat && lng) {
        payload.latitude = parseFloat(lat);
        payload.longitude = parseFloat(lng);
      }
      await updateBusiness(businessId, payload);
      toast.success('Negocio actualizado');
      onSaved();
    } catch {
      toast.error('Error al actualizar el negocio');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 text-sm sm:text-base">Editar Negocio</h2>
              <p className="text-xs text-gray-400 truncate">{businessName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {loadingData ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Cargando datos...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-5">

              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nombre del negocio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                  placeholder="Ej: Restaurante La Mesa"
                />
              </div>

              {/* Descripcion */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripcion</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white resize-none transition"
                  placeholder="Describe tu negocio..."
                />
              </div>

              {/* Direccion */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Direccion <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                  placeholder="Calle, numero, colonia"
                />
              </div>

              {/* Ciudad */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Ciudad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                  placeholder="San Salvador"
                />
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <Phone className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                    placeholder="+503 2222-3333"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <Globe className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                    Sitio web
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                    placeholder="https://tunegocio.com"
                  />
                </div>
              </div>

              {/* Coordenadas */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Coordenadas (opcional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                    placeholder="Latitud"
                  />
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                    placeholder="Longitud"
                  />
                </div>
              </div>

              {/* Precio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <DollarSign className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Nivel de precios
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriceLevel(p as 1 | 2 | 3 | 4)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                        priceLevel === p
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {'$'.repeat(p)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categorias */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categorias</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                          selectedCategories.includes(cat.id)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Horarios */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  <Clock className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                  Horarios
                </label>
                <div className="space-y-2">
                  {hours.map((h, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 rounded-xl">
                      {/* Dia + checkbox */}
                      <div className="flex items-center gap-3 sm:w-36 shrink-0">
                        <input
                          type="checkbox"
                          id={`edit-closed-${i}`}
                          checked={!h.is_closed}
                          onChange={(e) => updateHour(i, 'is_closed', !e.target.checked)}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <label htmlFor={`edit-closed-${i}`} className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                          {DAYS[i]}
                        </label>
                      </div>
                      {/* Horas */}
                      {h.is_closed ? (
                        <span className="text-xs text-gray-400 font-medium sm:ml-2">Cerrado</span>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={h.open_time}
                            onChange={(e) => updateHour(i, 'open_time', e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white transition"
                          />
                          <span className="text-gray-400 text-xs shrink-0">a</span>
                          <input
                            type="time"
                            value={h.close_time}
                            onChange={(e) => updateHour(i, 'close_time', e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white transition"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {submitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
