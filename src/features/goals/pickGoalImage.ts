import * as ImagePicker from 'expo-image-picker';

/**
 * Несколько снимков для доски желаний (без обрезки).
 * На части платформ библиотека вернёт один файл — можно вызывать повторно.
 */
export async function pickVisionBoardImageUris(): Promise<string[]> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 0.88,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => a.uri).filter(Boolean);
}

export async function pickGoalCoverImageUri(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [16, 9],
    quality: 0.85,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
