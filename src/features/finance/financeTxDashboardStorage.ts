import AsyncStorage from '@react-native-async-storage/async-storage';

const K_LIFE = 'finance_tx_bucket_life_v1';
const K_WORK = 'finance_tx_bucket_work_v1';

/** Стартовый набор «на жизнь» (имена как в транзакциях; регистр при матчинге не важен). */
export const DEFAULT_FINANCE_LIFE_BUCKET_NAMES: string[] = [
  'ии-сервисы',
  'обучение',
  'бытовые расходы',
  'другое',
  'квартира',
  'коммуналка',
  'лера',
  'на себя',
  'подарки',
  'подписки+интернет',
  'путешествия',
  'рабочие расходы',
  'семейный отдых',
  'совместное время с Лерой',
];

export const DEFAULT_FINANCE_WORK_BUCKET_NAMES: string[] = ['зарплаты', 'налоги', 'рабочие сервисы', 'реклама'];

async function readJsonNameArr(key: string, fallback: string[]): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null || raw === '') return [...fallback];
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [...fallback];
    return v.map((x) => String(x).trim()).filter(Boolean);
  } catch {
    return [...fallback];
  }
}

export async function loadFinanceTxBucketLife(): Promise<string[]> {
  return readJsonNameArr(K_LIFE, DEFAULT_FINANCE_LIFE_BUCKET_NAMES);
}

export async function loadFinanceTxBucketWork(): Promise<string[]> {
  return readJsonNameArr(K_WORK, DEFAULT_FINANCE_WORK_BUCKET_NAMES);
}

export async function saveFinanceTxBucketLife(names: string[]): Promise<void> {
  await AsyncStorage.setItem(K_LIFE, JSON.stringify(names.map((n) => n.trim()).filter(Boolean)));
}

export async function saveFinanceTxBucketWork(names: string[]): Promise<void> {
  await AsyncStorage.setItem(K_WORK, JSON.stringify(names.map((n) => n.trim()).filter(Boolean)));
}
