export const PM_STATUSES = [
  { key: "not_started", label: "не начато" },
  { key: "copywriting", label: "написание текстов" },
  { key: "copy_approval", label: "согласование текстов" },
  { key: "design_first_screen", label: "дизайн первого экрана/слайда" },
  { key: "approval_first_screen", label: "согласование первого экрана/слайда" },
  { key: "design", label: "дизайн" },
  { key: "client_approval", label: "согласование с клиентом" },
  { key: "done", label: "готов" },
  { key: "pause", label: "пауза" },
] as const;

export type PmStatusKey = (typeof PM_STATUSES)[number]["key"];

export const DEFAULT_STATUS: PmStatusKey = "not_started";

export function isValidStatus(s: string): s is PmStatusKey {
  return PM_STATUSES.some(({ key }) => key === s);
}

export function statusLabel(key: PmStatusKey): string {
  return PM_STATUSES.find((s) => s.key === key)?.label ?? key;
}
