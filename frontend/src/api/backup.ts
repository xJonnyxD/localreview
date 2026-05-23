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
