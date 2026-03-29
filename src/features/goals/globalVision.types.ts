import type { AnnualSphere } from '@/features/goals/annualGoals.types';

export type GlobalVisionTextBlock = {
  id: string;
  kind: 'text';
  text: string;
};

export type GlobalVisionImageBlock = {
  id: string;
  kind: 'image';
  imageUri: string | null;
};

export type GlobalVisionBlock = GlobalVisionTextBlock | GlobalVisionImageBlock;

export type GlobalVisionDocument = {
  blocks: GlobalVisionBlock[];
  /** Видение по сферам (отдельно от годовых целей). */
  sphereVisions: Record<AnnualSphere, string>;
  updatedAt: string;
};
