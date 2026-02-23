import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiPostFormData } from "../lib/api";
import { PageHeader } from "../components/PageHeader";

export function CreatePage() {
  const navigate = useNavigate();
  type Friend = { id: number; username: string | null; firstName: string | null; lastName: string | null };
  const [title, setTitle] = useState("");
  const [includeMe, setIncludeMe] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [participantsExtra, setParticipantsExtra] = useState("");
  const [description, setDescription] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [iconType, setIconType] = useState<"auto" | "upload">("auto");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [witnessUserId, setWitnessUserId] = useState<number | "">("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const friendName = (f: Friend) => [f.firstName, f.lastName].filter(Boolean).join(" ") || f.username || `#${f.id}`;
  const participantsString = [
    ...(includeMe ? ["Я"] : []),
    ...selectedParticipantIds.map((id) => friends.find((x) => x.id === id)).filter(Boolean).map((f) => friendName(f!)),
    ...participantsExtra.split(",").map((s) => s.trim()).filter(Boolean),
  ].join(", ") || "";
  const hasParticipants = includeMe || selectedParticipantIds.length > 0 || participantsExtra.trim().length > 0;

  useEffect(() => {
    apiGet<{ id: number; username: string | null; firstName: string | null; lastName: string | null }[]>("/api/friends")
      .then(setFriends)
      .catch(() => setFriends([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!hasParticipants) {
      setError("Выберите участников или введите имена");
      return;
    }
    if (iconType === "upload" && !iconFile) {
      setError("Выберите файл иконки");
      return;
    }
    setSaving(true);
    try {
      const parts = participantsString || "Я";
      const scheduleVal = showSchedule && scheduledAt ? new Date(scheduledAt).toISOString() : null;
      const witnessVal = witnessUserId === "" ? undefined : witnessUserId;
      if (iconType === "upload" && iconFile) {
        const fd = new FormData();
        fd.set("title", title);
        fd.set("description", description);
        fd.set("participants", parts);
        fd.set("iconType", "upload");
        if (scheduleVal) fd.set("scheduledAt", scheduleVal);
        if (witnessVal != null) fd.set("witnessUserId", String(witnessVal));
        fd.set("icon", iconFile);
        if (photoFile) fd.set("photo", photoFile);
        await apiPostFormData("/api/pranks", fd);
      } else if (photoFile) {
        const fd = new FormData();
        fd.set("title", title);
        fd.set("description", description);
        fd.set("participants", parts);
        fd.set("iconType", "auto");
        if (scheduleVal) fd.set("scheduledAt", scheduleVal);
        if (witnessVal != null) fd.set("witnessUserId", String(witnessVal));
        fd.set("photo", photoFile);
        await apiPostFormData("/api/pranks", fd);
      } else {
        await apiPost("/api/pranks", {
          title,
          description: description || null,
          iconType: "auto",
          participants: parts,
          scheduledAt: scheduleVal,
          witnessUserId: witnessVal ?? null,
        });
      }
      navigate("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка сохранения";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Новый прикол" showBack backTo="/" />
      <div className="px-4 pt-2">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
          <div>
            <label htmlFor="create-title" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Название *
            </label>
            <input
              id="create-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="Например: Как мы разыграли Петю"
              className="input-field"
            />
          </div>
          <div>
            <p className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Участники *
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIncludeMe((prev) => !prev)}
                className={`min-h-tap px-4 py-2 rounded-full text-sm font-medium transition border-2 ${
                  includeMe
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
                }`}
              >
                Я
              </button>
              {friends.map((f) => {
                  const selected = selectedParticipantIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setSelectedParticipantIds((prev) =>
                          selected ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                        )
                      }
                      className={`min-h-tap px-4 py-2 rounded-full text-sm font-medium transition border-2 ${
                        selected
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]"
                      }`}
                    >
                      {friendName(f)}
                    </button>
                  );
                })}
              </div>
            {friends.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] mb-2">
                Добавьте друзей в разделе «Друзья», чтобы выбирать их участниками.
              </p>
            )}
            <input
              id="create-participants-extra"
              type="text"
              value={participantsExtra}
              onChange={(e) => setParticipantsExtra(e.target.value)}
              maxLength={500}
              placeholder="Или введите имена через запятую"
              className="input-field"
              aria-label="Дополнительные участники"
            />
          </div>
          <div>
            <label htmlFor="create-witness" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Свидетель (друг)
            </label>
            {friends.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-2">
                Добавьте друзей в разделе «Друзья», чтобы выбрать свидетеля.
              </p>
            ) : (
              <select
                id="create-witness"
                value={witnessUserId === "" ? "" : witnessUserId}
                onChange={(e) => setWitnessUserId(e.target.value === "" ? "" : Number(e.target.value))}
                className="input-field"
              >
                <option value="">Не выбирать</option>
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {[f.firstName, f.lastName].filter(Boolean).join(" ") || f.username || `#${f.id}`}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Фото (одно)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-[var(--radius-button)] file:border-0 file:bg-[var(--color-primary-muted)] file:text-[var(--color-primary)] file:font-medium"
            />
          </div>

          <div className="pt-4 space-y-6">
            <div>
              <button
                type="button"
                onClick={() => setShowSchedule((s) => !s)}
                className="block w-full text-left text-sm text-[var(--color-primary)] min-h-0 py-3 px-0"
              >
                {showSchedule ? "Убрать дату" : "📅 Запланировать на потом"}
              </button>
              {showSchedule && (
                <div className="mt-3">
                  <label htmlFor="create-date" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Дата и время
                  </label>
                  <input
                    id="create-date"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="input-field"
                  />
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowMore((m) => !m)}
                className="block w-full text-left text-sm text-[var(--color-text-muted)] min-h-0 py-3 px-0"
              >
                {showMore ? "Скрыть доп. поля" : "Ещё (описание, иконка)"}
              </button>
            </div>
          </div>
          {showMore && (
            <div className="space-y-4 card p-4">
              <div>
                <label htmlFor="create-desc" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Описание
                </label>
                <textarea
                  id="create-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Необязательно"
                  className="input-field min-h-[80px] py-3"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Иконка
                </span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="iconType"
                      checked={iconType === "auto"}
                      onChange={() => setIconType("auto")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Из названия</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="iconType"
                      checked={iconType === "upload"}
                      onChange={() => setIconType("upload")}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Загрузить</span>
                  </label>
                </div>
                {iconType === "upload" && (
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
                    className="mt-2 block w-full text-sm"
                  />
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="text-[var(--color-error)] text-sm" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="btn-secondary flex-1"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-[2]"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
