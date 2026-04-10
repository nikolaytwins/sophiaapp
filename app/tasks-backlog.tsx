import { BacklogTasksScreen } from '@/features/tasks/BacklogTasksScreen';

/** Тот же экран, что вкладка «Входящие», но со шапкой стека «Назад». */
export default function TasksBacklogStackScreen() {
  return <BacklogTasksScreen variant="stack" />;
}
