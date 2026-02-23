import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { AuthImage } from "../components/AuthImage";
import type { Prank } from "../types";

interface FeedItem extends Prank {
  author: { id: number; username: string | null; firstName: string | null; lastName: string | null };
}

export function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<FeedItem[]>("/api/feed")
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  const authorName = (a: FeedItem["author"]) =>
    [a.firstName, a.lastName].filter(Boolean).join(" ") || a.username || `#${a.id}`;

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
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Лента 🌻</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Новые приколы ваших друзей</p>
      </div>

      {error && (
        <p className="text-[var(--color-error)] mb-4 text-sm" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p className="text-[var(--color-text-muted)] py-8 text-center">Загрузка…</p>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-[var(--color-text-muted)]">Пока ничего нет</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Добавьте друзей — их приколы появятся здесь
          </p>
        </div>
      )}
      {!loading && items.length > 0 && (
        <ul className="space-y-3" role="list">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/prank/${p.id}`}
                state={{ fromFriendUserId: p.author.id }}
                className="card flex items-center gap-4 p-4 active:bg-[var(--color-border)]/30 transition"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-[var(--color-border)]">
                  <AuthImage path={p.iconPath} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[var(--color-text)] truncate">{p.title}</div>
                  <div className="text-sm text-[var(--color-text-muted)] mt-0.5">
                    {authorName(p.author)}
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
