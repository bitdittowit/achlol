import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { AuthImage } from "../components/AuthImage";
import { PageHeader } from "../components/PageHeader";
import type { Prank } from "../types";

interface FriendUser {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

export function FriendPranksPage() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<FriendUser | null>(null);
  const [pranks, setPranks] = useState<Prank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    apiGet<{ user: FriendUser; pranks: Prank[] }>(`/api/friends/${userId}/pranks`)
      .then((data) => {
        setUser(data.user);
        setPranks(data.pranks);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [userId]);

  const friendName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || `Друг #${user.id}`
    : "";

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Приколы друга" showBack backTo="/friends" />
        <div className="px-4 py-8 text-center text-[var(--color-text-muted)]">Загрузка…</div>
      </>
    );
  }
  if (error || !user) {
    return (
      <>
        <PageHeader title="Приколы друга" showBack backTo="/friends" />
        <div className="px-4 py-8 text-center text-[var(--color-error)]">{error ?? "Не найдено"}</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={friendName} showBack backTo="/friends" />
      <div className="px-4 pt-2 pb-8">
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Альбом приколов
          {user.username && <span> · @{user.username}</span>}
        </p>
        {pranks.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-[var(--color-text-muted)]">Пока нет приколов</p>
          </div>
        ) : (
          <ul className="space-y-3" role="list">
            {pranks.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/prank/${p.id}`}
                  state={{ fromFriendUserId: user.id }}
                  className="card flex items-center gap-4 p-4 active:bg-[var(--color-border)]/30 transition"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-[var(--color-border)]">
                    <AuthImage path={p.iconPath} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[var(--color-text)] truncate">{p.title}</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-sm text-[var(--color-text-secondary)]">
                      <span>{formatDate(p.scheduledAt ?? p.createdAt)}</span>
                      <span>·</span>
                      <span>{p.status === "planned" ? "Запланирован" : "Случилось"}</span>
                      {p.confirmed && (
                        <>
                          <span>·</span>
                          <span className="text-[var(--color-accent)]">✓ Подтверждён</span>
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
    </>
  );
}
