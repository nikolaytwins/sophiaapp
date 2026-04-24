import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
};

/** Полноэкранный просмотр обложки цели без обрезки. */
export function GoalImageLightbox({ uri, visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  if (!uri) return null;

  const imgH = Math.max(240, winH - insets.top - insets.bottom - 56);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' }}>
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: insets.top + 6,
            right: 12,
            zIndex: 2,
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Закрыть"
        >
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <Pressable
          onPress={onClose}
          style={{
            flex: 1,
            paddingTop: insets.top + 52,
            paddingBottom: insets.bottom + 12,
            paddingHorizontal: 10,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Image
            source={{ uri }}
            style={{ width: winW - 20, height: imgH }}
            contentFit="contain"
            accessibilityLabel="Изображение цели"
          />
        </Pressable>
      </View>
    </Modal>
  );
}
