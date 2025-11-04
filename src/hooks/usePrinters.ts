import { useCallback, useEffect, useState } from 'react';
import { printersApi } from '../api/printers';
import { CreatePrinterRequest, Printer, UpdatePrinterRequest } from '../types';

export const usePrinters = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // fetchAll with optional silent mode to avoid resetting the list view state (scroll, placeholders)
  const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      const data = await printersApi.getAll();
      setPrinters(data);
    } catch (e: any) {
      console.error('Failed to fetch printers', e);
      if (!silent) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load printers');
      }
      // in silent mode keep previous error/ui state
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const create = async (payload: CreatePrinterRequest) => {
    await printersApi.create(payload);
    await fetchAll({ silent: true });
  };

  const update = async (id: number, payload: UpdatePrinterRequest) => {
    await printersApi.update(id, payload);
    await fetchAll({ silent: true });
  };

  const remove = async (id: number) => {
    await printersApi.remove(id);
    await fetchAll({ silent: true });
  };

  const setActive = async (id: number, state: boolean) => {
    await printersApi.setActive(id, state);
    await fetchAll({ silent: true });
  };

  const getById = async (id: number) => {
    return printersApi.getById(id);
  };

  return { printers, loading, error, fetchAll, create, update, remove, setActive, getById };
};
