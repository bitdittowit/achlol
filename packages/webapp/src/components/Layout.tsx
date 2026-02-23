import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/", label: "Приколы", icon: "📒" },
  { path: "/feed", label: "Лента 🌻", icon: "📰" },
  { path: "/friends", label: "Друзья", icon: "👋" },
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[var(--color-bg)]">
      <main className="flex-1 overflow-auto pb-6" style={{ paddingBottom: "calc(1.5rem + var(--nav-height) + var(--safe-bottom))" }}>
        {children}
      </main>
      <nav
        className="fixed bottom-0 left-0 right-0 flex items-center justify-around bg-[var(--color-surface)] border-t border-[var(--color-border)] z-20"
        style={{
          height: "calc(var(--nav-height) + var(--safe-bottom))",
          paddingBottom: "var(--safe-bottom)",
        }}
      >
        {navItems.map(({ path, label, icon }) => {
          const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-tap transition ${
                isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-xl leading-none" aria-hidden>{icon}</span>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
