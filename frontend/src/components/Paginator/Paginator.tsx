interface Props {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function Paginator({ page, totalPages, onPrev, onNext }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-3 px-1">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="text-muted hover:text-foreground text-sm px-2.5 py-1 rounded-md hover:bg-surface-raised disabled:opacity-30 transition-colors"
      >
        ← Prev
      </button>
      <span className="text-xs text-muted">Page {page + 1} of {totalPages}</span>
      <button
        onClick={onNext}
        disabled={page === totalPages - 1}
        className="text-muted hover:text-foreground text-sm px-2.5 py-1 rounded-md hover:bg-surface-raised disabled:opacity-30 transition-colors"
      >
        Next →
      </button>
    </div>
  );
}
