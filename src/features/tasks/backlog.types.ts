export type BacklogPriority = 'high' | 'medium' | 'low';

export type BacklogTaskType = {
  id: string;
  name: string;
  created_at: string;
};

export type BacklogTask = {
  id: string;
  title: string;
  description: string | null;
  type_id: string | null;
  priority: BacklogPriority;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BacklogTaskView = BacklogTask & {
  typeName: string | null;
};
