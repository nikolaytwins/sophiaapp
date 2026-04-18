import type { AnnualSphere } from '@/features/goals/annualGoals.types';

export type GlobalVisionTextBlock = {
  id: string;
  kind: 'text';
  text: string;
  /** Пользовательские фото под этим абзацем эссе. */
  imageUris?: string[];
};

export type GlobalVisionImageBlock = {
  id: string;
  kind: 'image';
  imageUri: string | null;
};

export type GlobalVisionBlock = GlobalVisionTextBlock | GlobalVisionImageBlock;

export type GlobalVisionDocument = {
  blocks: GlobalVisionBlock[];
  /** Фото под плашками уровней целей (ключ = id из strategy.config, напр. gv-min). */
  goalLevelPhotos: Record<string, string[]>;
  /** Видение по сферам (отдельно от годовых целей). */
  sphereVisions: Record<AnnualSphere, string>;
  updatedAt: string;
};
