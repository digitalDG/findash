import { useState, useEffect } from "react";

export function usePagination<T>(items: T[], pageSize: number, resetKey?: unknown) {
  const [page, setPage] = useState(0);

  // Reset to first page whenever the list's identity changes (ticker/watchlist switch, etc.)
  useEffect(() => { setPage(0); }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = items.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize);

  return {
    page: clampedPage,
    totalPages,
    pageItems,
    goNext: () => setPage((p) => Math.min(p + 1, totalPages - 1)),
    goPrev: () => setPage((p) => Math.max(p - 1, 0)),
  };
}
