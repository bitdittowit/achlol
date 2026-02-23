import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { apiGet, apiPatch, apiPost, apiPostFormData, apiDelete } from "../lib/api";
import { AuthImage } from "../components/AuthImage";
import { PageHeader } from "../components/PageHeader";
import type { Prank } from "../types";

function witnessDisplayName(w: { firstName: string | null; lastName: string | null; username: string | null }): string {
  const name = [w.firstName, w.lastName].filter(Boolean).join(" ");
  return name || w.username || "Свидетель";
}

export function PrankPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const fromFriendUserId = (location.state as { fromFriendUserId?: number } | null)?.fromFriendUserId;
  const backTo = fromFriendUserId ? `/friend/${fromFriendUserId}` : "/";
  const [prank, setPrank] = useState<Prank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [completionPhotoFiles, setCompletionPhotoFiles] = useState<File[]>([]);
  const [completionVideoFiles, setCompletionVideoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmRejectSaving, setConfirmRejectSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet<Prank & { isOwner?: boolean; isWitness?: boolean }>(`/api/pranks/${id}`)
      .then((data) => setPrank({ ...data, isOwner: data.isOwner !== false }))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleMarkCompleted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const hasMedia = completionPhotoFiles.length > 0 || completionVideoFiles.length > 0;
      if (hasMedia) {
        const fd = new FormData();
        fd.set("completionStoryText", storyText);
        completionPhotoFiles.forEach((file) => fd.append("photo", file));
        completionVideoFiles.forEach((file) => fd.append("video", file));
        const updated = await apiPostFormData<Prank & { confirmed?: boolean; witnessRejected?: boolean }>(
          `/api/pranks/${id}/complete`,
          fd
        );
        setPrank({ ...updated, isOwner: true });
      } else {
        await apiPatch(`/api/pranks/${id}`, {
          status: "completed",
          completionStoryText: storyText || null,
        });
        setPrank((prev) => (prev ? { ...prev, status: "completed", completionStoryText: storyText || null } : null));
      }
      setShowCompleteForm(false);
      setCompletionPhotoFiles([]);
      setCompletionVideoFiles([]);
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

  const handleConfirm = async () => {
    if (!id) return;
    setConfirmRejectSaving(true);
    try {
      const updated = await apiPost<Prank & { confirmed?: boolean }>(`/api/pranks/${id}/confirm`, {});
      setPrank((prev) => (prev ? { ...prev, confirmed: true, confirmedAt: updated.confirmedAt ?? undefined } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setConfirmRejectSaving(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setConfirmRejectSaving(true);
    try {
      const updated = await apiPost<Prank & { witnessRejected?: boolean }>(`/api/pranks/${id}/reject`, {});
      setPrank((prev) => (prev ? { ...prev, witnessRejected: true, ...updated } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setConfirmRejectSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDelete(`/api/pranks/${id}`);
      setShowDeleteConfirm(false);
      navigate(backTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setDeleting(false);
    }
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/15 px-1.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                    <span aria-hidden>✓</span>
                    Подтверждён
                  </span>
                )}
                {prank.witnessRejected && !prank.confirmed && (
                  <span className="text-[var(--color-text-muted)] text-xs">Свидетель отклонил</span>
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

          {prank.witnessUserId != null && prank.witness && (
            <div className="px-4 pb-4 border-t border-[var(--color-border)] pt-4">
              <div className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                Подтверждение свидетеля
              </div>
              <p className="text-sm text-[var(--color-text)]">
                Свидетель: <strong>{witnessDisplayName(prank.witness)}</strong>
                {prank.confirmed && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)]/15 px-1.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                    ✓ Подтвердил
                  </span>
                )}
                {prank.witnessRejected && !prank.confirmed && (
                  <span className="ml-2 text-[var(--color-text-muted)] text-xs">Отклонил</span>
                )}
                {!prank.confirmed && !prank.witnessRejected && (
                  <span className="ml-2 text-[var(--color-text-muted)] text-xs">
                    — ждёт подтверждения (можно в боте или здесь)
                  </span>
                )}
              </p>
              {prank.isWitness && !prank.confirmed && !prank.witnessRejected && (
                <div className="mt-3 flex flex-col gap-2">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Вы свидетель этого прикола. Подтвердите, что это было на самом деле?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={confirmRejectSaving}
                      className="btn-primary flex-1 bg-[var(--color-accent)] hover:opacity-90"
                    >
                      {confirmRejectSaving ? "…" : "✓ Подтвердить"}
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={confirmRejectSaving}
                      className="btn-secondary flex-1"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              )}
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
            <div>
              <p className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                Фото и видео с места событий
              </p>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center justify-center min-h-tap px-4 py-2 rounded-[var(--radius-button)] bg-[var(--color-primary-muted)] text-[var(--color-primary)] text-sm font-medium">
                    + Фото
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      setCompletionPhotoFiles((prev) => [...prev, ...files]);
                    }}
                  />
                </label>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center justify-center min-h-tap px-4 py-2 rounded-[var(--radius-button)] bg-[var(--color-primary-muted)] text-[var(--color-primary)] text-sm font-medium">
                    + Видео
                  </span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      setCompletionVideoFiles((prev) => [...prev, ...files]);
                    }}
                  />
                </label>
              </div>
              {(completionPhotoFiles.length > 0 || completionVideoFiles.length > 0) && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                  {completionPhotoFiles.length > 0 && `Фото: ${completionPhotoFiles.length}`}
                  {completionPhotoFiles.length > 0 && completionVideoFiles.length > 0 && " · "}
                  {completionVideoFiles.length > 0 && `Видео: ${completionVideoFiles.length}`}
                </p>
              )}
            </div>
            {error && <p className="text-[var(--color-error)] text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCompleteForm(false);
                  setCompletionPhotoFiles([]);
                  setCompletionVideoFiles([]);
                }}
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

        {prank.isOwner !== false && !showCompleteForm && (
          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
            >
              Удалить прикол
            </button>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-10 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
            <div className="card p-4 max-w-sm w-full">
              <h2 id="delete-dialog-title" className="font-medium text-[var(--color-text)] mb-1">
                Удалить прикол?
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Все фото и видео будут удалены. Это нельзя отменить.
              </p>
              {error && <p className="text-[var(--color-error)] text-sm mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 px-4 rounded-[var(--radius-button)] font-medium bg-[var(--color-error)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {deleting ? "Удаление…" : "Удалить"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
