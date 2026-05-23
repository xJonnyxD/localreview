import api from './client';

export interface BackupEntry {
  id: string;
  type: 'db' | 'web';
  label: string;
  filename: string;
  size: number;
  size_human: string;
  created_at: string;
  status: 'ok' | 'partial' | 'error';
  total_rows?: number;
  tables_ok?: number;
  tables_error?: number;
  files_count?: number;
}

export interface BackupStatus {
  history: BackupEntry[];
  next_backup_at: string | null;
  total_backups: number;
}

export async function getBackupStatus(): Promise<BackupStatus> {
  const { data } = await api.get('/backup/status');
  return data;
}

export async function triggerDbBackup(): Promise<{ ok: boolean; backup: BackupEntry }> {
  const { data } = await api.post('/backup/db');
  return data;
}

export async function triggerWebBackup(): Promise<{ ok: boolean; backup: BackupEntry }> {
  const { data } = await api.post('/backup/web');
  return data;
}

export async function triggerFullBackup(): Promise<{ ok: boolean; backup: { db: BackupEntry; web: BackupEntry } }> {
  const { data } = await api.post('/backup/full');
  return data;
}

export function getDownloadUrl(type: 'db' | 'web', filename: string): string {
  const token = localStorage.getItem('access_token');
  // Construimos la URL base desde el cliente axios
  const baseURL = api.defaults.baseURL ?? '/api/v1';
  return `${baseURL}/backup/download/${type}/${filename}?token=${token}`;
}

export async function downloadBackup(type: 'db' | 'web', filename: string): Promise<void> {
  const token = localStorage.getItem('access_token');
  const response = await api.get(`/backup/download/${type}/${filename}`, {
    responseType: 'blob',
    headers: { Authorization: `Bearer ${token}` },
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
