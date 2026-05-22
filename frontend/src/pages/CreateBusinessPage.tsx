import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Phone, Globe, Clock, DollarSign, ChevronLeft, Loader2, Plus } from 'lucide-react';
import { createBusiness, getCategories } from '../api/businesses';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/toastStore';
import type { Category } from '../types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

interface HourEntry {
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
}

const defaultHours = (): HourEntry[] =>
  DAYS.map((_, i) => ({
    day_of_week: i,
    is_closed: i >= 6,
    open_time: '08:00',
    close_time: '18:00',
  }));

export default function CreateBusinessPage() {
  useDocumentTitle('Crear negocio');
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);

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
  const [hours, setHours] = useState<HourEntry[]>(defaultHours());

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  if (!user || (user.role !== 'business_owner' && user.role !== 'admin')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
        <div>
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Acceso restringido a propietarios de negocios</p>
        </div>
      </div>
    );
  }

  const toggleCategory = (id: number) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const updateHour = (index: number, field: keyof HourEntry, value: string | boolean) => {
    setHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !city.trim()) {
      toast.error('Nombre, direccion y ciudad son obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        state: null,
        country: 'SV',
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        latitude: lat ? parseFloat(lat) : undefined,
        longitude: lng ? parseFloat(lng) : undefined,
        price_level: priceLevel,
        category_ids: selectedCategories,
        hours: hours.filter((h) => !h.is_closed),
      };
      const biz = await createBusiness(payload);
      toast.success(`Negocio "${biz.name}" creado exitosamente`);
      navigate(`/business/${biz.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al crear el negocio';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Dashboard</span>
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-900">Crear Negocio</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">

          {/* Informacion basica */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900">Informacion General</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nombre del negocio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ej: Restaurante La Pampa"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descripcion</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe tu negocio, especialidad, ambiente..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm bg-gray-50 focus:bg-white transition"
                />
              </div>

              {/* Nivel de precio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-gray-400" /> Nivel de precio
                  </span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriceLevel(p as 1 | 2 | 3 | 4)}
                      className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                        priceLevel === p
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
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
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
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
            </div>
          </div>

          {/* Ubicacion */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900">Ubicacion</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Direccion <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  placeholder="Ej: 1a Calle Poniente #123"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Ciudad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  placeholder="Ej: San Salvador"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                />
              </div>
              {/* Coordenadas — apiladas en móvil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Latitud (opcional)</label>
                  <input
                    type="number"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    step="any"
                    placeholder="13.6929"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Longitud (opcional)</label>
                  <input
                    type="number"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    step="any"
                    placeholder="-89.2182"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <Phone className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900">Contacto</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+503 7000-0000"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-gray-400" /> Sitio web
                  </span>
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://minegocio.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-gray-50 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Horarios — layout adaptativo en móvil */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900">Horarios de Atencion</h2>
            </div>
            <div className="space-y-3">
              {hours.map((h, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-2 border-b border-gray-50 last:border-0">
                  {/* Fila superior en móvil: día + checkbox */}
                  <div className="flex items-center justify-between sm:justify-start sm:gap-3">
                    <span className="w-20 sm:w-24 text-sm font-semibold text-gray-700">{DAYS[i]}</span>
                    <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={h.is_closed}
                        onChange={(e) => updateHour(i, 'is_closed', e.target.checked)}
                        className="w-4 h-4 accent-red-500"
                      />
                      <span className={h.is_closed ? 'text-red-500 font-medium' : ''}>Cerrado</span>
                    </label>
                  </div>
                  {/* Fila inferior en móvil: horarios */}
                  {!h.is_closed && (
                    <div className="flex items-center gap-2 sm:gap-3 pl-0 sm:pl-0">
                      <input
                        type="time"
                        value={h.open_time}
                        onChange={(e) => updateHour(i, 'open_time', e.target.value)}
                        className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
                      />
                      <span className="text-gray-400 text-sm shrink-0">—</span>
                      <input
                        type="time"
                        value={h.close_time}
                        onChange={(e) => updateHour(i, 'close_time', e.target.value)}
                        className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit — full width en móvil */}
          <div className="flex flex-col sm:flex-row gap-3 pb-6">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition shadow-sm w-full sm:w-auto"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
              ) : (
                <><Plus className="w-4 h-4" /> Crear Negocio</>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition w-full sm:w-auto text-center"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
