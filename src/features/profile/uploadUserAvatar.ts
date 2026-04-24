import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'avatars';

function extFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.webp')) return 'webp';
  if (lower.endsWith('.gif')) return 'gif';
  return 'jpg';
}

function mimeForExt(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

/**
 * Загружает файл в Storage `avatars/{userId}/avatar.{ext}` и возвращает публичный URL.
 */
export async function uploadUserAvatarToStorage(
  sb: SupabaseClient,
  userId: string,
  localUri: string
): Promise<{ publicUrl: string } | { error: string }> {
  const ext = extFromUri(localUri);
  const path = `${userId}/avatar.${ext}`;
  const contentType = mimeForExt(ext);

  let blob: Blob;
  try {
    const res = await fetch(localUri);
    blob = await res.blob();
  } catch {
    return { error: 'Не удалось прочитать файл изображения' };
  }

  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type && blob.type !== 'application/octet-stream' ? blob.type : contentType,
    upsert: true,
  });

  if (upErr) {
    if (upErr.message?.includes('Bucket not found') || upErr.message?.includes('not found')) {
      return {
        error:
          'Хранилище аватаров не настроено. Выполни миграцию supabase/migrations/020_storage_avatars.sql в проекте Supabase.',
      };
    }
    return { error: upErr.message };
  }

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  if (!publicUrl) return { error: 'Не удалось получить публичный URL' };
  return { publicUrl };
}
