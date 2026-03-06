"use client";

import { useEffect, useState } from "react";
import { PM_STATUSES, statusLabel, type PmStatusKey } from "@/lib/statuses";

type PmCard = {
  id: string;
  source_project_id: string | null;
  source_detail_id?: string | null;
  name: string;
  deadline: string | null;
  status: PmStatusKey;
  extra?: string | null;
  created_at: string;
  updated_at: string;
};

type CardExtra = {
  figmaLink?: string;
  tzLink?: string;
  tildaAccess?: string;
  wishes?: string;
  explanations?: string;
  otherLinks?: string;
};

function parseExtra(s: string | null | undefined): CardExtra {
  if (!s) return {};
  try {
    const o = JSON.parse(s);
    return typeof o === "object" && o !== null ? o : {};
  } catch {
    return {};
  }
}

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return s;
  }
}

export default function BoardPage() {
  const [cards, setCards] = useState<PmCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [modalCard, setModalCard] = useState<PmCard | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalExtra, setModalExtra] = useState<CardExtra>({});
  const [savingExtra, setSavingExtra] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards`);
      if (!r.ok) throw new Error("Не удалось загрузить карточки");
      const data = await r.json();
      setCards(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          deadline: newDeadline || null,
          status: "not_started",
        }),
      });
      if (r.ok) {
        const card = await r.json();
        setCards((prev) => [card, ...prev]);
        setNewName("");
        setNewDeadline("");
      } else {
        const err = await r.json().catch(() => ({}));
        setError(err.error || "Не удалось создать");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setAdding(false);
    }
  }

  async function syncFromAgency() {
    setSyncing(true);
    setError(null);
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards/sync-from-agency`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.success) {
        await load();
        if (data.created > 0) setError(null);
      } else {
        setError(data.error || "Ошибка синхронизации");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSyncing(false);
    }
  }

  async function clearBoard() {
    if (!confirm("Удалить все карточки из канбана? В Agency проекты останутся.")) return;
    setClearing(true);
    setError(null);
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards/clear`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.success) {
        await load();
      } else {
        setError(data.error || "Ошибка очистки");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setClearing(false);
    }
  }

  async function syncOnlyMarch() {
    if (!confirm("Очистить канбан и подтянуть только проекты с дедлайном в марте?")) return;
    setSyncing(true);
    setError(null);
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    const year = new Date().getFullYear();
    try {
      const r = await fetch(`${base}/api/cards/sync-from-agency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyMonth: `${year}-03`, clearFirst: true }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok && data.success) {
        await load();
      } else {
        setError(data.error || "Ошибка синхронизации");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSyncing(false);
    }
  }

  async function updateStatus(cardId: string, newStatus: PmStatusKey) {
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) throw new Error("Не удалось обновить");
      const updated = await r.json();
      setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
    } catch (e) {
      console.error(e);
    }
  }

  function handleDragStart(e: React.DragEvent, cardId: string) {
    e.dataTransfer.setData("application/json", JSON.stringify({ cardId }));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, newStatus: PmStatusKey) {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const { cardId } = JSON.parse(raw);
      const card = cards.find((c) => c.id === cardId);
      if (card && card.status !== newStatus) updateStatus(cardId, newStatus);
    } catch (_) {}
  }

  function openModal(card: PmCard) {
    setModalCard(card);
    setModalName(card.name);
    setModalExtra(parseExtra(card.extra));
  }

  async function deleteCardOnly(cardId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Удалить карточку из канбана? В Agency проект останется.")) return;
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards/${cardId}`, { method: "DELETE" });
      if (r.ok) setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (modalCard?.id === cardId) setModalCard(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function saveModalExtra() {
    if (!modalCard) return;
    setSavingExtra(true);
    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
    try {
      const r = await fetch(`${base}/api/cards/${modalCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: modalName.trim() || modalCard.name, extra: JSON.stringify(modalExtra) }),
      });
      if (r.ok) {
        const updated = await r.json();
        setCards((prev) => prev.map((c) => (c.id === modalCard.id ? updated : c)));
        setModalCard(updated);
        setModalName(updated.name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingExtra(false);
    }
  }

  if (loading) return <div className="p-6">Загрузка…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const byStatus = (status: PmStatusKey) => cards.filter((c) => c.status === status);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Канбан проектов</h1>

      <form onSubmit={addProject} className="mb-6 flex flex-wrap items-end gap-3 p-4 bg-white rounded-lg border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Новый проект (добавится и в Agency)</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Название"
            className="w-64 px-3 py-2 border border-slate-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Дедлайн</label>
          <input
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? "Создание…" : "+ Добавить проект"}
        </button>
        <button
          type="button"
          onClick={syncFromAgency}
          disabled={syncing}
          className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 disabled:opacity-50"
        >
          {syncing ? "Подтягиваю…" : "Подтянуть проекты из Agency"}
        </button>
        <button
          type="button"
          onClick={syncOnlyMarch}
          disabled={syncing}
          className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 disabled:opacity-50"
          title="Очистить канбан и оставить только проекты с дедлайном в марте"
        >
          {syncing ? "…" : "Только март"}
        </button>
        <button
          type="button"
          onClick={clearBoard}
          disabled={clearing}
          className="px-4 py-2 border border-red-200 text-red-700 text-sm font-medium rounded hover:bg-red-50 disabled:opacity-50"
        >
          {clearing ? "Очищаю…" : "Очистить канбан"}
        </button>
      </form>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {PM_STATUSES.map(({ key }) => (
          <div
            key={key}
            className="flex-shrink-0 w-64 rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, key)}
          >
            <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-sm font-medium text-slate-700 min-h-[3.5rem] flex items-center flex-wrap leading-tight">
              {statusLabel(key)}
              <span className="ml-2 text-slate-400">({byStatus(key).length})</span>
            </div>
            <div className="p-2 min-h-[120px] space-y-2">
              {byStatus(key).map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, card.id)}
                  className="rounded border border-slate-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing group"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-medium text-slate-800 text-sm min-w-0 flex-1">{card.name}</div>
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal(card); }}
                        className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Доп. информация"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => deleteCardOnly(card.id, e)}
                        className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Удалить из канбана (в Agency остаётся)"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V7m1 14h4" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Дедлайн: {formatDate(card.deadline)}</div>
                  <select
                    className="mt-2 w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                    value={card.status}
                    onChange={(e) => updateStatus(card.id, e.target.value as PmStatusKey)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {PM_STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {modalCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalCard(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <input
                type="text"
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                className="flex-1 text-lg font-semibold text-slate-800 border border-transparent hover:border-slate-300 rounded px-2 py-1 -mx-2 focus:border-blue-500 focus:outline-none"
                placeholder="Название проекта"
              />
              <button type="button" onClick={() => setModalCard(null)} className="p-1 rounded text-slate-500 hover:bg-slate-100">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ссылка на Figma</label>
                <input
                  type="url"
                  value={modalExtra.figmaLink ?? ""}
                  onChange={(e) => setModalExtra((x) => ({ ...x, figmaLink: e.target.value || undefined }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ссылка на ТЗ</label>
                <input
                  type="url"
                  value={modalExtra.tzLink ?? ""}
                  onChange={(e) => setModalExtra((x) => ({ ...x, tzLink: e.target.value || undefined }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Доступы к Tilda</label>
                <input
                  type="text"
                  value={modalExtra.tildaAccess ?? ""}
                  onChange={(e) => setModalExtra((x) => ({ ...x, tildaAccess: e.target.value || undefined }))}
                  placeholder="Логин, пароль, ссылка..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Пожелания</label>
                <textarea
                  value={modalExtra.wishes ?? ""}
                  onChange={(e) => setModalExtra((x) => ({ ...x, wishes: e.target.value || undefined }))}
                  placeholder="Пожелания клиента..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Пояснения</label>
                <textarea
                  value={modalExtra.explanations ?? ""}
                  onChange={(e) => setModalExtra((x) => ({ ...x, explanations: e.target.value || undefined }))}
                  placeholder="Пояснения по проекту..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Другие ссылки</label>
                <textarea
                  value={modalExtra.otherLinks ?? ""}
                  onChange={(e) => setModalExtra((x) => ({ ...x, otherLinks: e.target.value || undefined }))}
                  placeholder="По одной на строку или через запятую..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button type="button" onClick={() => setModalCard(null)} className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50">Закрыть</button>
              <button type="button" onClick={saveModalExtra} disabled={savingExtra} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{savingExtra ? "Сохранение…" : "Сохранить"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
