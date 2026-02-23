import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost, apiPostFormData } from "../lib/api";
import { getDisplayName } from "../lib/telegram";

export function CreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fromField, setFromField] = useState("");
  const [toField, setToField] = useState("");
  const [iconType, setIconType] = useState<"auto" | "upload">("auto");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fromField) setFromField(getDisplayName());
  }, [fromField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (iconType === "upload" && !iconFile) {
      setError("Выберите файл иконки");
      return;
    }
    setSaving(true);
    try {
      if (iconType === "upload" && iconFile) {
        const fd = new FormData();
        fd.set("title", title);
        fd.set("description", description);
        fd.set("fromField", fromField);
        fd.set("toField", toField);
        fd.set("iconType", "upload");
        if (scheduledAt) fd.set("scheduledAt", new Date(scheduledAt).toISOString());
        fd.set("icon", iconFile);
        if (photoFile) fd.set("photo", photoFile);
        await apiPostFormData("/api/pranks", fd);
      } else {
        const body: Record<string, unknown> = {
          title,
          description: description || null,
          iconType: "auto",
          fromField,
          toField,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        };
        if (photoFile) {
          const fd = new FormData();
          fd.set("title", title);
          fd.set("description", description);
          fd.set("fromField", fromField);
          fd.set("toField", toField);
          fd.set("iconType", "auto");
          if (scheduledAt) fd.set("scheduledAt", new Date(scheduledAt).toISOString());
          fd.set("photo", photoFile);
          await apiPostFormData("/api/pranks", fd);
        } else {
          await apiPost("/api/pranks", body);
        }
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Новый прикол</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Иконка</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="iconType"
                checked={iconType === "auto"}
                onChange={() => setIconType("auto")}
              />
              Из названия
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="iconType"
                checked={iconType === "upload"}
                onChange={() => setIconType("upload")}
              />
              Загрузить
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">От кого *</label>
          <input
            type="text"
            value={fromField}
            onChange={(e) => setFromField(e.target.value)}
            required
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Кому *</label>
          <input
            type="text"
            value={toField}
            onChange={(e) => setToField(e.target.value)}
            required
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Фото (одно)</label>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Запланировать на</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-3 border border-gray-300 rounded-xl"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
