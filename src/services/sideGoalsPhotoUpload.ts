import { getSupabase } from '@/lib/supabase';

function guessExt(uri: string): string {
  const noQuery = uri.split('?')[0] ?? uri;
  const tail = noQuery.split('.').pop() ?? '';
  if (tail.length <= 5 && /^[a-z0-9]+$/i.test(tail)) return tail.toLowerCase();
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
 * Загружает локальный снимок (file://, content://, blob:) в Supabase Storage и возвращает публичный URL.
 * Такие URL переживают перезагрузку веба и другие устройства.
 */
export async function uploadSideGoalPhotoToSupabase(
  localUri: string,
  goalId: string
): Promise<{ publicUrl: string } | { error: string }> {
  const sb = getSupabase();
  if (!sb) return { error: 'Облако не настроено' };

  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.user?.id) return { error: 'Войди в аккаунт, чтобы сохранить фото в облаке' };

  const uid = session.user.id;
  const ext = guessExt(localUri);
  const objectPath = `${uid}/${goalId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  let res: Response;
  try {
    res = await fetch(localUri);
  } catch {
    return { error: 'Не удалось прочитать файл снимка' };
  }
  if (!res.ok) return { error: 'Не удалось прочитать файл снимка' };

  const blob = await res.blob();
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : mimeForExt(ext);

  const { error } = await sb.storage.from('side_goal_assets').upload(objectPath, blob, {
    contentType,
    upsert: false,
  });

  if (error) return { error: error.message };

  const { data } = sb.storage.from('side_goal_assets').getPublicUrl(objectPath);
  if (!data?.publicUrl) return { error: 'Не удалось получить URL файла' };
  return { publicUrl: data.publicUrl };
}
