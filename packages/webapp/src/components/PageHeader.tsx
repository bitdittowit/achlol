import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  backTo?: string;
}

export function PageHeader({ title, showBack, backTo = "/" }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-border)]/50">
      {showBack ? (
        <button
          type="button"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="flex items-center justify-center min-w-tap min-h-tap -ml-1 rounded-[var(--radius-button)] text-[var(--color-primary)] active:bg-[var(--color-primary-muted)]"
          aria-label="Назад"
        >
          <span className="text-xl">←</span>
        </button>
      ) : (
        <span className="min-w-tap" aria-hidden />
      )}
      <h1 className="flex-1 text-lg font-semibold text-[var(--color-text)] truncate">
        {title}
      </h1>
      <span className="min-w-tap" aria-hidden />
    </header>
  );
}
