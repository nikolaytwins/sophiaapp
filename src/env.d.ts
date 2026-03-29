/// <reference types="expo/types" />

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_ASTRO_API_URL?: string;
    EXPO_PUBLIC_SOPHIA_HABITS_URL?: string;
    EXPO_PUBLIC_SOPHIA_HABITS_SYNC_KEY?: string;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  }
}
