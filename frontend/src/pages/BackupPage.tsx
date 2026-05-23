import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, Globe, Download, RefreshCw, Clock, CheckCircle2,
  AlertTriangle, Loader2, ShieldCheck, ChevronLeft, Zap, Archive,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { toast } from '../stores/toastStore';
import {
  getBackupStatus, triggerDbBackup, triggerWebBackup, triggerFullBackup,
  downloadBackup,
  type BackupEntry, type BackupStatus,
} from '../api/backup';

// ─── Reloj de cuenta regresiva ────────────────────────────────────────────────

function Countdown({ nextBackupAt }: { nextBackupAt: string | null }) {
  const [remaining, setRemaining] = useState<{ h: number; m: number; s: number } | null>(null);
  const [progress, setProgress] = useState(0); // 0-100%

  useEffect(() => {
    if (!nextBackupAt) return;

    const TOTAL = 12 * 3600; // 12 horas en segundos

    const tick = () => {
      const now = Date.now();
      const target = new Date(nextBackupAt).getTime();
      const diffSec = Math.max(0, Math.floor((target - now) / 1000));
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;
      setRemaining({ h, m, s });
      setProgress(Math.max(0, Math.min(100, ((TOTAL - diffSec) / TOTAL) * 100)));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextBackupAt]);

  if (!nextBackupAt || !remaining) {
    return (
      <div className="text-center text-gray-400 text-sm py-2">
        Calculando próximo backup...
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="space-y-4">
      {/* Dígitos del reloj */}
      <div className="flex items-center justify-center gap-2">
        {/* Horas */}
        <div className="flex flex-col items-center">
          <div className="bg-indigo-900 text-white font-mono text-3xl font-bold w-16 h-16 rounded-xl flex items-center justify-center shadow-inner">
            {pad(remaining.h)}
          </div>
          <span className="text-xs text-gray-400 mt-1">horas</span>
        </div>
        <span className="text-2xl font-bold text-indigo-400 mb-4">:</span>
        {/* Minutos */}
        <div className="flex flex-col items-center">
          <div className="bg-indigo-900 text-white font-mono text-3xl font-bold w-16 h-16 rounded-xl flex items-center justify-center shadow-inner">
            {pad(remaining.m)}
          </div>
          <span className="text-xs text-gray-400 mt-1">minutos</span>
        </div>
        <span className="text-2xl font-bold text-indigo-400 mb-4">:</span>
        {/* Segundos */}
        <div className="flex flex-col items-center">
          <div className="bg-indigo-800 text-indigo-200 font-mono text-3xl font-bold w-16 h-16 rounded-xl flex items-center justify-center shadow-inner">
            {pad(remaining.s)}
          </div>
          <span className="text-xs text-gray-400 mt-1">segundos</span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="space-y-1">
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Último backup</span>
          <span>{progress.toFixed(1)}% completado</span>
          <span>Próximo backup</span>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Próximo backup automático:{' '}
        <span className="text-indigo-400 font-medium">
          {new Date(nextBackupAt).toLocaleString('es-SV', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </p>
    </div>
  );
}

// ─── Fila de historial ────────────────────────────────────────────────────────

function BackupRow({ entry }: { entry: BackupEntry }) {
  const [downloading, setDownloading] = useState(false);
  const isDb = entry.type === 'db';
  const date = new Date(entry.created_at).toLocaleString('es-SV', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadBackup(entry.type, entry.filename);
      toast.success(`Descargando ${entry.filename}`);
    } catch {
      toast.error('Error al descargar el backup');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-3 px-4 border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        isDb ? 'bg-indigo-900/60 text-indigo-400' : 'bg-purple-900/60 text-purple-400'
      }`}>
        {isDb ? <Database className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-200 truncate">{entry.label}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            entry.status === 'ok'
              ? 'bg-green-900/50 text-green-400'
              : entry.status === 'partial'
              ? 'bg-yellow-900/50 text-yellow-400'
              : 'bg-red-900/50 text-red-400'
          }`}>
            {entry.status === 'ok' ? '✓ OK' : entry.status === 'partial' ? '⚠ Parcial' : '✗ Error'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{date}</p>
        {isDb && entry.total_rows != null && (
          <p className="text-xs text-gray-600 mt-0.5">
            {entry.tables_ok} tablas · {entry.total_rows.toLocaleString()} filas
          </p>
        )}
        {!isDb && entry.files_count != null && (
          <p className="text-xs text-gray-600 mt-0.5">{entry.files_count} archivos</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-xs font-mono text-gray-400">{entry.size_human}</p>
          <p className="text-xs text-gray-600 mt-0.5 font-mono truncate max-w-[110px]">
            {entry.filename.slice(-18)}
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          title="Descargar backup"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-indigo-700 text-gray-400 hover:text-white transition disabled:opacity-40"
        >
          {downloading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function BackupPage() {
  useDocumentTitle('Backups del Sistema');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDb, setLoadingDb] = useState(false);
  const [loadingWeb, setLoadingWeb] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await getBackupStatus();
      setStatus(data);
    } catch {
      toast.error('Error al cargar el estado de backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    // Recargar el estado cada 30s para mantener el historial actualizado
    const interval = setInterval(loadStatus, 30_000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  if (!user || (user.role !== 'admin' && user.role !== 'business_owner')) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Acceso restringido</p>
        </div>
      </div>
    );
  }

  const handleDbBackup = async () => {
    setLoadingDb(true);
    try {
      const res = await triggerDbBackup();
      toast.success(`Backup de BD creado — ${res.backup.size_human}`);
      await loadStatus();
    } catch {
      toast.error('Error al crear backup de la base de datos');
    } finally {
      setLoadingDb(false);
    }
  };

  const handleWebBackup = async () => {
    setLoadingWeb(true);
    try {
      const res = await triggerWebBackup();
      toast.success(`Backup web creado — ${res.backup.size_human}`);
      await loadStatus();
    } catch {
      toast.error('Error al crear backup de archivos web');
    } finally {
      setLoadingWeb(false);
    }
  };

  const handleFullBackup = async () => {
    setLoadingFull(true);
    try {
      await triggerFullBackup();
      toast.success('Backup completo creado exitosamente');
      await loadStatus();
    } catch {
      toast.error('Error al crear backup completo');
    } finally {
      setLoadingFull(false);
    }
  };

  const dbHistory = status?.history.filter((b) => b.type === 'db') ?? [];
  const webHistory = status?.history.filter((b) => b.type === 'web') ?? [];
  const lastDb = dbHistory[0];
  const lastWeb = webHistory[0];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <span className="text-gray-700">/</span>
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-bold text-white">Sistema de Backups</h1>
          </div>
          <button
            onClick={loadStatus}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ── Reloj de próximo backup ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-white">Próximo Backup Automático</h2>
            <span className="ml-auto text-xs bg-green-900/40 text-green-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Activo · cada 12 horas
            </span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          ) : (
            <Countdown nextBackupAt={status?.next_backup_at ?? null} />
          )}
        </div>

        {/* ── Botones de backup manual ── */}
        <div>
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Backup Manual
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* DB */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-900/60 rounded-xl flex items-center justify-center">
                  <Database className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Base de Datos</p>
                  <p className="text-xs text-gray-500">Cassandra · 11 tablas</p>
                </div>
              </div>
              {lastDb && (
                <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-xs space-y-0.5">
                  <p className="text-gray-400">Último backup</p>
                  <p className="text-gray-300 font-medium">{lastDb.size_human}</p>
                  <p className="text-gray-500">
                    {new Date(lastDb.created_at).toLocaleString('es-SV', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
              <button
                onClick={handleDbBackup}
                disabled={loadingDb || loadingFull}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition"
              >
                {loadingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {loadingDb ? 'Creando...' : 'Backup BD'}
              </button>
            </div>

            {/* Web */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-900/60 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Archivos Web</p>
                  <p className="text-xs text-gray-500">Fotos · uploads/</p>
                </div>
              </div>
              {lastWeb && (
                <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-xs space-y-0.5">
                  <p className="text-gray-400">Último backup</p>
                  <p className="text-gray-300 font-medium">{lastWeb.size_human}</p>
                  <p className="text-gray-500">
                    {new Date(lastWeb.created_at).toLocaleString('es-SV', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
              <button
                onClick={handleWebBackup}
                disabled={loadingWeb || loadingFull}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition"
              >
                {loadingWeb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {loadingWeb ? 'Creando...' : 'Backup Web'}
              </button>
            </div>

            {/* Completo */}
            <div className="bg-gray-900 border border-indigo-800/50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-900/60 to-purple-900/60 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Backup Completo</p>
                  <p className="text-xs text-gray-500">BD + archivos</p>
                </div>
              </div>
              <div className="bg-indigo-950/40 border border-indigo-800/30 rounded-lg px-3 py-2 text-xs text-indigo-300">
                Crea ambos backups en una sola operación. Recomendado antes de actualizaciones importantes.
              </div>
              <button
                onClick={handleFullBackup}
                disabled={loadingDb || loadingWeb || loadingFull}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition"
              >
                {loadingFull ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loadingFull ? 'Creando...' : 'Backup Completo'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Historial ── */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <h2 className="font-bold text-white">Historial de Backups</h2>
            </div>
            <span className="text-sm text-gray-500">
              {status?.total_backups ?? 0} total
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : (status?.history.length ?? 0) === 0 ? (
            <div className="py-16 text-center">
              <Archive className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No hay backups aún</p>
              <p className="text-gray-600 text-xs mt-1">
                El primer backup automático se creará en 12 horas, o puedes crear uno manualmente
              </p>
            </div>
          ) : (
            <div>
              {status!.history.map((entry) => (
                <BackupRow key={`${entry.type}-${entry.id}`} entry={entry} />
              ))}
            </div>
          )}
        </div>

        {/* ── Info técnica ── */}
        <div className="bg-gray-900/50 border border-gray-800/50 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-400 space-y-1">
              <p className="font-semibold text-gray-300">Información de almacenamiento</p>
              <p>Los backups se guardan en <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs text-indigo-300">./backups/db/</code> y <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs text-indigo-300">./backups/web/</code> en el servidor.</p>
              <p>El backup de BD exporta todas las tablas de Cassandra a archivos JSON comprimidos en ZIP.</p>
              <p>El backup web comprime todos los archivos de <code className="bg-gray-800 px-1.5 py-0.5 rounded text-xs text-indigo-300">./uploads/</code> (fotos de negocios y reseñas).</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
