const API_BASE = import.meta.env.VITE_API_URL ?? "";

function getInitData(): string {
  return window.Telegram?.WebApp?.initData ?? "";
}

function headers(init?: HeadersInit): Headers {
  const h = new Headers(init);
  const initData = getInitData();
  if (initData) {
    h.set("x-telegram-init-data", initData);
  }
  h.set("Content-Type", "application/json");
  return h;
}

function headersMultipart(init?: HeadersInit): Headers {
  const h = new Headers(init);
  const initData = getInitData();
  if (initData) {
    h.set("x-telegram-init-data", initData);
  }
  return h;
}

/** Auth only, no Content-Type — for GET/DELETE without body */
function headersNoBody(init?: HeadersInit): Headers {
  const h = new Headers(init);
  const initData = getInitData();
  if (initData) {
    h.set("x-telegram-init-data", initData);
  }
  return h;
}

const base = () => API_BASE.replace(/\/$/, "");

function parseJsonOrThrow<T>(res: Response): Promise<T> {
  return res.text().then((text) => {
    try {
      return (text ? JSON.parse(text) : null) as T;
    } catch {
      throw new Error(
        res.status === 404
          ? "Сервер не найден. В корневом .env задайте VITE_API_URL=URL туннеля на бэкенд (порт 3000), перезапустите webapp."
          : "Сервер вернул неверный ответ. Задайте VITE_API_URL в корневом .env (URL туннеля на бэкенд) и перезапустите webapp."
      );
    }
  });
}

function parseErrorResponse(res: Response, text: string): string {
  if (text) {
    try {
      const data = JSON.parse(text) as { error?: string };
      if (typeof data?.error === "string") return data.error;
    } catch {
      /* ignore */
    }
  }
  return res.statusText || "Request failed";
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    headers: headersNoBody(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseErrorResponse(res, text));
  }
  return parseJsonOrThrow<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return parseJsonOrThrow<T>(res);
}

export async function apiPostNoJson(path: string, body?: unknown): Promise<void> {
  const res = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return parseJsonOrThrow<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${base()}${path}`, {
    method: "DELETE",
    headers: headersNoBody(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseErrorResponse(res, text));
  }
}

export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const h = headersMultipart();
  h.delete("Content-Type");
  const res = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: h,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  return parseJsonOrThrow<T>(res);
}

/** Returns URL for fetching file with auth (use in fetch, not in img src) */
export function fileApiPath(path: string): string {
  return `${base()}/api/files/${path}`;
}

/** Fetch image with auth and return blob URL for use in img src */
export async function fetchImageBlobUrl(path: string): Promise<string> {
  const initData = getInitData();
  const res = await fetch(fileApiPath(path), {
    headers: initData ? { "x-telegram-init-data": initData } : {},
  });
  if (!res.ok) throw new Error("Failed to load image");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
