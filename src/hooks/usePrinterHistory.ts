import { useCallback, useEffect, useState } from 'react';
import { printerHistoryApi } from '../api/printerHistory';
import { usersApi } from '../api/users';
import { PrinterHistory, User } from '../types';
import { parseDbDate } from '../utils/datetime';

/**
 * usePrinterHistory
 * - fetches history entries for a printer
 * - populates `employee` (User) when only employeeId is present by fetching user(s)
 * - no auto-polling; consumer can call refresh() or we refresh after user actions
 */
export const usePrinterHistory = (printerId: number | undefined) => {
  const [items, setItems] = useState<PrinterHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const enrichWithUsers = useCallback(async (list: PrinterHistory[]) => {
    // collect missing user ids
    const missing = Array.from(new Set(list.filter(h => !h.employee && h.employeeId).map(h => Number(h.employeeId))));
    if (missing.length === 0) return list;

    try {
      const promises = missing.map(id => usersApi.getById(id).catch(() => null));
      const users = await Promise.all(promises);
      const byId: Record<number, User> = {};
      users.forEach(u => { if (u && typeof u.id === 'number') byId[u.id] = u; });

      return list.map(h => ({ ...h, employee: h.employee || (h.employeeId ? byId[Number(h.employeeId)] : undefined) }));
    } catch (e) {
      console.warn('Failed to enrich history with users', e);
      return list;
    }
  }, []);

  const fetch = useCallback(async () => {
    if (!printerId) return;
    try {
      setLoading(true);
      setError(null);
      const list = await printerHistoryApi.getByPrinter(printerId);
      const enriched = await enrichWithUsers(list);
      // Mirror order: show newest first (descending by createdAt)
      const ts = (h: any): number => {
        const raw: string | undefined = h?.occurredAt || h?.createdAt || h?.created || h?.created_at || h?.timestamp || h?.date;
        return parseDbDate(raw)?.getTime() ?? 0;
      };
      setItems(enriched.sort((a, b) => ts(b) - ts(a)));
    } catch (e: any) {
      console.error('Failed to fetch printer history', e);
      setError(e?.response?.data?.message || e?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [printerId, enrichWithUsers]);

  useEffect(() => {
    fetch();
    return () => {};
  }, [fetch]);

  return { items, loading, error, refresh: fetch };
};
