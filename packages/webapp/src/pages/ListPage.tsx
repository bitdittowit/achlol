import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { AuthImage } from "../components/AuthImage";
import type { Prank, PrankStatus } from "../types";

export function ListPage() {
  const [tab, setTab] = useState<PrankStatus | "all">("planned");
  const [pranks, setPranks] = useState<Prank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const query = tab === "all" ? "" : `?status=${tab}`;
    apiGet<Prank[]>(`/api/pranks${query}`)
      .then(setPranks)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
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
    <div>
      <h1 className="text-xl font-bold mb-4">Трекер приколов</h1>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setTab("planned")}
          className={`px-3 py-1.5 rounded-lg ${tab === "planned" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Активные
        </button>
        <button
          type="button"
          onClick={() => setTab("completed")}
          className={`px-3 py-1.5 rounded-lg ${tab === "completed" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Архив
        </button>
      </div>
      <Link
        to="/new"
        className="block w-full py-3 text-center bg-green-600 text-white rounded-xl font-medium mb-6"
      >
        + Новый прикол
      </Link>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-gray-500">Загрузка…</p>}
      {!loading && !error && pranks.length === 0 && (
        <p className="text-gray-500">Пока ничего нет</p>
      )}
      {!loading && pranks.length > 0 && (
        <ul className="space-y-3">
          {pranks.map((p) => (
            <li key={p.id}>
              <Link
                to={`/prank/${p.id}`}
                className="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-gray-100"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                  <AuthImage path={p.iconPath} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-sm text-gray-500">
                    {formatDate(p.scheduledAt ?? p.createdAt)} · {p.status === "planned" ? "Запланирован" : "Выполнен"}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
