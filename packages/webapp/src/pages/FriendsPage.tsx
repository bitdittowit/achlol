import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";

interface Friend {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface IncomingRequest {
  id: number;
  fromUser: Friend;
  createdAt: string;
}

interface OutgoingRequest {
  id: number;
  toUser: Friend;
  createdAt: string;
}

function initial(name: string | null): string {
  if (!name || !name.trim()) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiGet<Friend[]>("/api/friends"),
      apiGet<IncomingRequest[]>("/api/friends/requests"),
      apiGet<OutgoingRequest[]>("/api/friends/requests/outgoing"),
    ])
      .then(([f, r, o]) => {
        setFriends(f);
        setRequests(r);
        setOutgoing(o);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const raw = username.replace(/^@/, "").trim();
    if (!raw) return;
    setSending(true);
    try {
      await apiPost("/api/friends/request", { username: raw });
      setUsername("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (requestId: number) => {
    setError(null);
    try {
      await apiPost(`/api/friends/requests/${requestId}/accept`, {});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const handleReject = async (requestId: number) => {
    setError(null);
    try {
      await apiPost(`/api/friends/requests/${requestId}/reject`, {});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const handleCancel = async (requestId: number) => {
    setError(null);
    try {
      await apiPost(`/api/friends/requests/${requestId}/cancel`, {});
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const name = (u: Friend) =>
    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || `ID ${u.id}`;

  return (
    <div className="px-4 pt-2 pb-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">
          Друзья
        </h1>
        <p className="text-[var(--color-text-muted)] mt-2 leading-relaxed">
          Добавляйте по @username — друзья смогут подтверждать ваши приколы и наоборот.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 uppercase tracking-wider">
          Добавить друга
        </h2>
        <form
          onSubmit={handleSendRequest}
          className="card p-5 space-y-4"
        >
          <div>
            <label htmlFor="friend-username" className="sr-only">
              Username в Telegram
            </label>
            <input
              id="friend-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите @username"
              className="input-field"
              aria-label="Username в Telegram"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="btn-primary w-full"
          >
            {sending ? "Отправка…" : "Отправить заявку"}
          </button>
        </form>
      </section>

      {error && (
        <div
          className="mb-6 p-4 rounded-[var(--radius-button)] bg-red-50 text-[var(--color-error)] text-sm"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[var(--color-text-muted)]">
          Загрузка…
        </div>
      ) : (
        <>
          {outgoing.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 uppercase tracking-wider">
                Исходящие заявки
              </h2>
              <ul className="space-y-3" role="list">
                {outgoing.map((r) => (
                  <li key={r.id} className="card overflow-hidden">
                    <div className="p-4 flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-semibold text-[var(--color-text-muted)] bg-[var(--color-border)]"
                        aria-hidden
                      >
                        {initial(r.toUser.firstName || r.toUser.username)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[var(--color-text)]">
                          {name(r.toUser)}
                        </div>
                        {r.toUser.username && (
                          <div className="text-sm text-[var(--color-text-muted)]">
                            @{r.toUser.username}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancel(r.id)}
                        className="min-h-tap px-4 rounded-[var(--radius-button)] text-sm text-[var(--color-text-muted)] border border-[var(--color-border)] bg-[var(--color-surface)] active:opacity-80"
                      >
                        Отменить
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {requests.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 uppercase tracking-wider">
                Входящие заявки
              </h2>
              <ul className="space-y-3" role="list">
                {requests.map((r) => (
                  <li key={r.id} className="card overflow-hidden">
                    <div className="p-4 flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-semibold text-[var(--color-primary)] bg-[var(--color-primary-muted)]"
                        aria-hidden
                      >
                        {initial(r.fromUser.firstName || r.fromUser.username)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[var(--color-text)]">
                          {name(r.fromUser)}
                        </div>
                        {r.fromUser.username && (
                          <div className="text-sm text-[var(--color-text-muted)]">
                            @{r.fromUser.username}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReject(r.id)}
                          className="min-h-tap min-w-tap rounded-[var(--radius-button)] flex items-center justify-center text-[var(--color-text-muted)] border border-[var(--color-border)] bg-[var(--color-surface)] active:opacity-80"
                          aria-label="Отклонить"
                        >
                          Нет
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAccept(r.id)}
                          className="min-h-tap min-w-[88px] px-4 rounded-[var(--radius-button)] font-medium bg-[var(--color-accent)] text-white flex items-center justify-center active:opacity-90"
                        >
                          Принять
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3 uppercase tracking-wider">
              Мои друзья
            </h2>
            {friends.length === 0 ? (
              <div className="card p-10 text-center">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl text-[var(--color-text-muted)] bg-[var(--color-bg)]"
                  aria-hidden
                >
                  👋
                </div>
                <p className="text-[var(--color-text)] font-medium">
                  Пока никого нет
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-[240px] mx-auto leading-relaxed">
                  Введите @username человека в Telegram выше и нажмите «Отправить заявку». После принятия он появится здесь.
                </p>
              </div>
            ) : (
              <ul className="space-y-2" role="list">
                {friends.map((u) => (
                  <li key={u.id}>
                    <Link
                      to={`/friend/${u.id}`}
                      className="card p-4 flex items-center gap-4 active:bg-[var(--color-border)]/30 transition"
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-semibold text-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                        aria-hidden
                      >
                        {initial(u.firstName || u.username)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[var(--color-text)]">
                          {name(u)}
                        </div>
                        {u.username && (
                          <div className="text-sm text-[var(--color-text-muted)]">
                            @{u.username}
                          </div>
                        )}
                      </div>
                      <span className="text-[var(--color-text-muted)]" aria-hidden>Приколы ›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
