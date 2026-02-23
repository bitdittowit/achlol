import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { AuthImage } from "../components/AuthImage";
import type { Prank, PrankStatus } from "../types";

export function ListPage() {
  const [tab, setTab] = useState<PrankStatus | "all">("planned");
  const [pranks, setPranks] = useState<Prank[]>([]);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [participantsQuery, setParticipantsQuery] = useState("");
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== "all") params.set("status", tab);
    if (participantsQuery.trim() && tab === "completed") {
      params.set("participantsQuery", participantsQuery.trim());
    }
    if (tab === "completed" && confirmedOnly) params.set("confirmedOnly", "true");
    const query = params.toString();
    apiGet<Prank[]>(`/api/pranks${query ? `?${query}` : ""}`)
      .then(setPranks)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [tab, participantsQuery, confirmedOnly]);

  useEffect(() => {
    if (tab === "planned") {
      apiGet<{ count: number }>("/api/pranks/active-count")
        .then((r) => setActiveCount(r.count))
        .catch(() => setActiveCount(null));
    } else {
      setActiveCount(null);
    }
  }, [tab]);

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="px-4 pt-2">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Альбом</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Смешные моменты и розыгрыши</p>
      </div>

      <div className="segment-pill mb-4">
        <button
          type="button"
          data-active={tab === "planned"}
          onClick={() => setTab("planned")}
        >
          Активные
        </button>
        <button
          type="button"
          data-active={tab === "completed"}
          onClick={() => setTab("completed")}
        >
          Случилось
        </button>
      </div>

      {tab === "planned" && activeCount !== null && (
        <p className="text-sm text-[var(--color-text-muted)] mb-3">
          Запланированных: {activeCount} / 30
        </p>
      )}
      {tab === "completed" && (
        <div className="mb-4 space-y-3">
          <input
            type="search"
            value={participantsQuery}
            onChange={(e) => setParticipantsQuery(e.target.value)}
            placeholder="Найти по участникам…"
            className="input-field"
            aria-label="Поиск по участникам"
          />
          <button
            type="button"
            onClick={() => setConfirmedOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              confirmedOnly
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-border)] text-[var(--color-text-secondary)]"
            }`}
            aria-pressed={confirmedOnly}
          >
            <span aria-hidden>✓</span>
            Только подтверждённые
          </button>
        </div>
      )}

      <Link
        to="/new"
        className="btn-primary mb-6 flex items-center justify-center gap-2"
      >
        <span aria-hidden>✨</span>
        Новый прикол
      </Link>

      {error && (
        <p className="text-[var(--color-error)] mb-4 text-sm" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p className="text-[var(--color-text-muted)] py-8 text-center">Загрузка…</p>
      )}
      {!loading && !error && pranks.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-[var(--color-text-muted)]">Пока ничего нет</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Нажмите «Новый прикол» — займёт пару секунд
          </p>
        </div>
      )}
      {!loading && pranks.length > 0 && (
        <ul className="space-y-3" role="list">
          {pranks.map((p) => (
            <li key={p.id}>
              <Link
                to={`/prank/${p.id}`}
                className="card flex items-center gap-4 p-4 active:bg-[var(--color-border)]/30 transition"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-[var(--color-border)]">
                  <AuthImage path={p.iconPath} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[var(--color-text)] truncate">
                    {p.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-sm text-[var(--color-text-secondary)]">
                    <span>{formatDate(p.scheduledAt ?? p.createdAt)}</span>
                    <span>·</span>
                    <span>{p.status === "planned" ? "Запланирован" : "Случилось"}</span>
                    {p.confirmed && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/15 px-1.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                          <span aria-hidden>✓</span>
                          Подтверждён
                        </span>
                      </>
                    )}
                    {p.witnessRejected && !p.confirmed && (
                      <>
                        <span>·</span>
                        <span className="text-[var(--color-text-muted)] text-xs">Свидетель отклонил</span>
                      </>
                    )}
                    {p.witnessUserId != null && !p.confirmed && !p.witnessRejected && (
                      <>
                        <span>·</span>
                        <span className="text-[var(--color-text-muted)] text-xs">Ожидает подтверждения</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-[var(--color-text-muted)]" aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
