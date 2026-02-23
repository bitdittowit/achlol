import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { apiGet, apiPatch } from "../lib/api";
import { AuthImage } from "../components/AuthImage";
import { PageHeader } from "../components/PageHeader";
import type { Prank } from "../types";

export function PrankPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const fromFriendUserId = (location.state as { fromFriendUserId?: number } | null)?.fromFriendUserId;
  const backTo = fromFriendUserId ? `/friend/${fromFriendUserId}` : "/";
  const [prank, setPrank] = useState<Prank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet<Prank & { isOwner?: boolean }>(`/api/pranks/${id}`)
      .then((data) => setPrank({ ...data, isOwner: data.isOwner !== false }))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleMarkCompleted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await apiPatch(`/api/pranks/${id}`, {
        status: "completed",
        completionStoryText: storyText || null,
      });
      setPrank((prev) => (prev ? { ...prev, status: "completed", completionStoryText: storyText || null } : null));
      setShowCompleteForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    return new Date(s).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Прикол" showBack backTo={backTo} />
        <div className="px-4 py-8 text-center text-[var(--color-text-muted)]">Загрузка…</div>
      </>
    );
  }
  if (error || !prank) {
    return (
      <>
        <PageHeader title="Прикол" showBack backTo={backTo} />
        <div className="px-4 py-8 text-center text-[var(--color-error)]">{error ?? "Не найдено"}</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={prank.title} showBack backTo={backTo} />
      <div className="px-4 pt-2 pb-8">
        <div className="card overflow-hidden">
          <div className="flex items-start gap-4 p-4">
            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-[var(--color-border)]">
              <AuthImage path={prank.iconPath} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-[var(--color-text-secondary)]">
                <span>{prank.status === "planned" ? "Запланирован" : "Случилось"}</span>
                {prank.scheduledAt && <span>· {formatDate(prank.scheduledAt)}</span>}
                {prank.confirmed && (
                  <span className="text-[var(--color-accent)]">✓ Подтверждён</span>
                )}
              </div>
            </div>
          </div>

          {prank.description && (
            <div className="px-4 pb-4">
              <p className="text-[var(--color-text)] whitespace-pre-wrap text-sm leading-relaxed">
                {prank.description}
              </p>
            </div>
          )}
          {prank.participants && (
            <div className="px-4 pb-4 text-sm">
              <span className="text-[var(--color-text-muted)]">Участники: </span>
              <span className="text-[var(--color-text)]">{prank.participants}</span>
            </div>
          )}
          {prank.media?.length > 0 && (
            <div className="px-4 pb-4">
              <div className="rounded-[var(--radius-input)] overflow-hidden bg-[var(--color-bg)]">
                <AuthImage
                  path={prank.media[0].filePath}
                  alt=""
                  className="w-full max-h-72 object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {prank.status === "completed" && prank.completionStoryText && (
          <div className="card p-4 mt-4 bg-[var(--color-accent-muted)] border-[var(--color-accent)]/20">
            <div className="text-sm font-medium text-[var(--color-accent)] mb-1">Как прошло</div>
            <p className="text-[var(--color-text)] whitespace-pre-wrap text-sm leading-relaxed">
              {prank.completionStoryText}
            </p>
          </div>
        )}

        {prank.isOwner !== false && prank.status === "planned" && !showCompleteForm && (
          <button
            type="button"
            onClick={() => setShowCompleteForm(true)}
            className="btn-primary mt-6 bg-[var(--color-accent)] hover:opacity-90"
          >
            Случилось! Покажи и расскажи
          </button>
        )}

        {prank.isOwner !== false && prank.status === "planned" && showCompleteForm && (
          <form onSubmit={handleMarkCompleted} className="mt-6 space-y-4">
            <div>
              <label htmlFor="prank-story" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                Рассказ (как прошло)
              </label>
              <textarea
                id="prank-story"
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                maxLength={5000}
                rows={4}
                placeholder="Опиши, как прошёл прикол…"
                className="input-field min-h-[100px] py-3"
              />
            </div>
            {error && <p className="text-[var(--color-error)] text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCompleteForm(false)}
                className="btn-secondary flex-1"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-[2]"
              >
                {saving ? "Сохранение…" : "Отметить, что случилось"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
