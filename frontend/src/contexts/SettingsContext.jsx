import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const cached = localStorage.getItem('system_settings');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(!settings);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.settings.get();
      const data = res.data?.data || null;
      setSettings(data);
      localStorage.setItem('system_settings', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to load system settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!settings) {
      fetchSettings();
    }
  }, []);

  const updateSettings = async (payload) => {
    try {
      const res = await api.settings.update(payload);
      const data = res.data?.data || payload;
      setSettings(data);
      localStorage.setItem('system_settings', JSON.stringify(data));
      toast.success('System settings updated');
      return { success: true, data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update system settings';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    settings,
    loading,
    refreshSettings: fetchSettings,
    updateSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};

export default SettingsContext;