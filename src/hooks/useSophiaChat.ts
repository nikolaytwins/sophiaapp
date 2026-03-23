import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repos } from '@/services/repositories';

export function useSophiaChat() {
  const qc = useQueryClient();

  const messages = useQuery({
    queryKey: ['chat', 'messages'],
    queryFn: () => repos.chat.listMessages(),
  });

  const prompts = useQuery({
    queryKey: ['chat', 'prompts'],
    queryFn: () => repos.prompts.list(),
  });

  const send = useMutation({
    mutationFn: (text: string) => repos.chat.appendUserMessage(text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', 'messages'] }),
  });

  return { messages, prompts, send };
}
