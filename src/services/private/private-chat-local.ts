import type { PrivateChatMessage, PrivateQuickPrompt } from '@/entities/private/models';

/** Статические подсказки UI — не астрологические данные. */
export const afterDarkQuickPrompts: PrivateQuickPrompt[] = [
  { id: 'q1', text: 'Разобрать мой вечерний фон' },
  { id: 'q2', text: 'Что мной движет: желание или напряжение?' },
  { id: 'q3', text: 'Есть ли окно для флирта на этой неделе?' },
  { id: 'q4', text: 'Стоит ли сегодня идти в социалку?' },
  { id: 'q5', text: 'Где главный риск?' },
  { id: 'q6', text: 'Мягкость, напор или дистанция?' },
  { id: 'q7', text: 'Это про близость, новизну или самоутверждение?' },
];

let chatMessages: PrivateChatMessage[] = [
  {
    id: 'seed',
    role: 'assistant',
    text:
      'Чат с моделью здесь не подключён к backend — только живые расчёты транзитов в остальных экранах After Dark.',
    createdAt: new Date().toISOString(),
  },
];

export function getLocalPrivateChatMessages(): PrivateChatMessage[] {
  return [...chatMessages];
}

export function appendLocalPrivateChat(userText: string): PrivateChatMessage[] {
  const t = Date.now();
  chatMessages = [
    ...chatMessages,
    {
      id: `u_${t}`,
      role: 'user',
      text: userText,
      createdAt: new Date().toISOString(),
    },
    {
      id: `a_${t}`,
      role: 'assistant',
      text:
        'Ответы ассистента нужно подключить к вашему AI API. Метрики и графики выше считаются через astro API (не моки).',
      createdAt: new Date().toISOString(),
    },
  ];
  return chatMessages;
}
