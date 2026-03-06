import { NextResponse } from "next/server";
import { createCard, listCards, deleteAllCards } from "@/lib/db";
import { DEFAULT_STATUS } from "@/lib/statuses";

/** Body: { onlyMonth?: "2025-03" | "2026-03", clearFirst?: boolean } — только проекты с дедлайном в этом месяце; clearFirst — сначала очистить канбан. */
export async function POST(request: Request) {
  try {
    let onlyMonth: string | undefined;
    let clearFirst = false;
    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        onlyMonth = typeof body.onlyMonth === "string" ? body.onlyMonth : undefined;
        clearFirst = Boolean(body.clearFirst);
      }
    } catch {
      /* no body */
    }

    const twinworksUrl = process.env.TWINWORKS_AGENCY_URL || "http://127.0.0.1:3001";
    const r = await fetch(`${twinworksUrl}/api/agency/projects`);
    if (!r.ok) throw new Error("Twinworks projects fetch failed");
    const projects: { id: string; name: string; deadline: string | null }[] = await r.json();

    let toSync = projects;
    if (onlyMonth) {
      // Дедлайн в формате YYYY-MM-DD или ISO — оставляем только те, у кого deadline в указанном месяце
      const [y, m] = onlyMonth.split("-");
      const prefix = y && m ? `${y}-${m}` : onlyMonth;
      toSync = projects.filter(
        (p) => p.deadline && (p.deadline.startsWith(prefix) || p.deadline.slice(0, 7) === prefix)
      );
    }

    if (clearFirst) {
      deleteAllCards();
    } else {
      const existing = listCards();
      const existingIds = new Set(existing.map((c) => c.source_project_id).filter(Boolean));
      toSync = toSync.filter((p) => !existingIds.has(p.id));
    }

    let created = 0;
    for (const p of toSync) {
      createCard({
        source_project_id: p.id,
        name: p.name,
        deadline: p.deadline ?? null,
        status: DEFAULT_STATUS,
      });
      created++;
    }

    return NextResponse.json({
      success: true,
      created,
      total: toSync.length,
      onlyMonth: onlyMonth ?? null,
      cleared: clearFirst,
    });
  } catch (e) {
    console.error("sync-from-agency", e);
    return NextResponse.json({ error: "Не удалось подтянуть проекты" }, { status: 500 });
  }
}
