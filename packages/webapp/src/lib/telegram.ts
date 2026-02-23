export function getTelegramUser(): { first_name: string; last_name?: string } | null {
  const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!user) return null;
  return {
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

export function getDisplayName(): string {
  const user = getTelegramUser();
  if (!user) return "";
  return [user.first_name, user.last_name].filter(Boolean).join(" ");
}

export function initTelegramWebApp(): void {
  window.Telegram?.WebApp?.ready();
  window.Telegram?.WebApp?.expand();
}
