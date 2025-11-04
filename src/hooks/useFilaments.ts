import { useState, useEffect, useCallback } from 'react';
import { filamentsApi } from '../api/filaments';
import { Filament, FilamentType, CreateFilamentRequest, UpdateFilamentRequest } from '../types';

export const useFilaments = () => {
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [types, setTypes] = useState<FilamentType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [f, t] = await Promise.all([filamentsApi.getAll(), filamentsApi.getTypes()]);
      setFilaments(f);
      setTypes(t);
    } catch (err) {
      console.error('Error fetching filaments/types:', err);
      setError('Failed to load filaments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Accept optional second argument to maintain backward-compat with callers passing a FilamentType (ignored)
  const create = async (data: CreateFilamentRequest, _type?: FilamentType) => {
    const created = await filamentsApi.create(data);
    await fetchAll(); // Refetch all data
    return created;
  };

  const update = async (id: number, data: UpdateFilamentRequest) => {
    const updated = await filamentsApi.update(id, data);
    await fetchAll(); // Refetch all data
    return updated;
  };

  const remove = async (id: number) => {
    await filamentsApi.remove(id);
    await fetchAll(); // Refetch all data
  };

  const createType = async (data: { name: string; description: string }) => {
    const t = await filamentsApi.createType(data as any);
    await fetchAll(); // Refetch all data
    return t;
  };

  const deleteType = async (id: number) => {
    await filamentsApi.deleteType(id);
    await fetchAll(); // Refetch all data
  };

  const updateType = async (id: number, data: { name: string; description: string }) => {
    const updated = await filamentsApi.updateType(id, data as any);
    await fetchAll(); // Refetch all data
    return updated;
  };

  return { filaments, types, loading, error, fetchAll, create, update, remove, createType, deleteType, updateType };
};
