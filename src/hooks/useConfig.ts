import { useState, useEffect, useCallback } from 'react';
import type { CarapaceConfig } from '../lib/types';
import { getConfig, saveConfig } from '../lib/api';

export function useConfig() {
  const [config, setConfig] = useState<CarapaceConfig | null>(null);
  const [exists, setExists] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getConfig();
    setExists(result.exists);
    setConfig(result.config || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (updated: CarapaceConfig) => {
      await saveConfig(updated);
      setConfig(updated);
    },
    []
  );

  return { config, exists, loading, save, reload: load };
}
