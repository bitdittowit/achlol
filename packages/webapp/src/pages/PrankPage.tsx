import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, apiPatch } from "../lib/api";
import { AuthImage } from "../components/AuthImage";
import type { Prank } from "../types";

export function PrankPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prank, setPrank] = useState<Prank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet<Prank>(`/api/pranks/${id}`)
      .then(setPrank)
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

  if (loading) return <p className="text-gray-500">Загрузка…</p>;
  if (error || !prank) return <p className="text-red-600">{error ?? "Не найдено"}</p>;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="text-blue-600 mb-4"
      >
        ← Назад
      </button>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
          <AuthImage path={prank.iconPath} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{prank.title}</h1>
          <p className="text-sm text-gray-500">
            {prank.status === "planned" ? "Запланирован" : "Выполнен"}
            {prank.scheduledAt && ` · ${formatDate(prank.scheduledAt)}`}
          </p>
        </div>
      </div>
      {prank.description && (
        <p className="text-gray-700 mb-4 whitespace-pre-wrap">{prank.description}</p>
      )}
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        <span className="text-gray-500">От кого:</span>
        <span>{prank.fromField}</span>
        <span className="text-gray-500">Кому:</span>
        <span>{prank.toField}</span>
      </div>
      {prank.media?.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-2">Фото</div>
          <div className="rounded-lg overflow-hidden bg-gray-100">
            <AuthImage
              path={prank.media[0].filePath}
              alt=""
              className="w-full max-h-64 object-contain"
            />
          </div>
        </div>
      )}
      {prank.status === "completed" && prank.completionStoryText && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <div className="text-sm font-medium text-green-800 mb-1">Как прошло</div>
          <p className="text-green-900 whitespace-pre-wrap">{prank.completionStoryText}</p>
        </div>
      )}
      {prank.status === "planned" && !showCompleteForm && (
        <button
          type="button"
          onClick={() => setShowCompleteForm(true)}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-medium"
        >
          Выполнено! Покажи и расскажи
        </button>
      )}
      {prank.status === "planned" && showCompleteForm && (
        <form onSubmit={handleMarkCompleted} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Рассказ (как прошло)</label>
            <textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              maxLength={5000}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Опиши, как прошёл прикол…"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Отметить выполненным"}
            </button>
            <button
              type="button"
              onClick={() => setShowCompleteForm(false)}
              className="px-4 py-3 border border-gray-300 rounded-xl"
            >
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
