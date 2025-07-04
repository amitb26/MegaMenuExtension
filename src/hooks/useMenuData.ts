import { useState, useEffect } from 'react';
import { sharepointDocumentService, MenuData } from '../services/sharepointDocumentService';

interface UseMenuDataReturn {
  menuData: MenuData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useMenuData = (): UseMenuDataReturn => {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sharepointDocumentService.getMenuData();
      setMenuData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load menu data';
      setError(errorMessage);
      console.error('Error loading menu data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  const refetch = async () => {
    await fetchMenuData();
  };

  return {
    menuData,
    loading,
    error,
    refetch
  };
};