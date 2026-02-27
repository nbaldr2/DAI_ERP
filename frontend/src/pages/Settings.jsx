import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  Settings as SettingsIcon,
  User,
  Globe,
  Palette,
  Shield,
  Bell,
  Database,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Moon,
  Sun,
  Monitor,
  Languages,
  Lock,
  Mail,
  Phone,
  MapPin,
  Building,
  Camera
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings, loading: settingsLoading, updateSettings, refreshSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    department: user?.department || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    language: i18n.language || 'en',
    theme: theme || 'light',
    notifications: {
      email: true,
      push: true,
      stock_alerts: true,
      expiry_alerts: true,
      sales_reports: false
    },
    dateFormat: 'DD/MM/YYYY',
    currency: 'QAR',
    timezone: 'Asia/Qatar'
  });

  const [systemSettings, setSystemSettings] = useState({
    company_name: 'Dai Trading Company',
    company_address: 'Doha, Qatar',
    company_phone: '+974-XXXX-XXXX',
    company_email: 'info@daitrading.qa',
    tax_rate: '0.00',
    currency: 'QAR',
    backup_frequency: 'daily',
    session_timeout: '60'
  });

  useEffect(() => {
    // Load user preferences and system settings
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setSystemSettings((prev) => ({
        ...prev,
        company_name: settings.company_name || prev.company_name,
        company_address: settings.address || prev.company_address,
        company_phone: settings.phone || prev.company_phone,
        company_email: settings.email || prev.company_email,
        tax_rate: settings.tax_rate?.toString?.() || prev.tax_rate,
        currency: settings.currency || prev.currency,
        cr_number: settings.cr_number || prev.cr_number,
        logo_url: settings.logo_url || prev.logo_url,
      }));
    }
  }, [settings]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      await refreshSettings();
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // API call to update profile
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      await apiService.auth.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    try {
      setLoading(true);

      // Update language
      if (preferences.language !== i18n.language) {
        i18n.changeLanguage(preferences.language);
        document.dir = preferences.language === 'ar' ? 'rtl' : 'ltr';
      }

      // Update theme
      if (preferences.theme !== theme) {
        setTheme(preferences.theme);
      }

      // Save preferences to API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Preferences updated successfully');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemSettingsUpdate = async () => {
    try {
      setLoading(true);
      // Basic client-side validation
      if (!systemSettings.company_name?.trim()) {
        toast.error('Company name is required');
        setLoading(false);
        return;
      }
      if (systemSettings.company_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(systemSettings.company_email)) {
        toast.error('Invalid company email format');
        setLoading(false);
        return;
      }
      if (!systemSettings.currency?.trim()) {
        toast.error('Currency is required');
        setLoading(false);
        return;
      }
      const taxNum = Number(systemSettings.tax_rate);
      if (Number.isNaN(taxNum) || taxNum < 0 || taxNum > 100) {
        toast.error('Tax rate must be between 0 and 100');
        setLoading(false);
        return;
      }
      if (systemSettings.logo_url && !/^https?:\/\//.test(systemSettings.logo_url) && !systemSettings.logo_url.startsWith('/')) {
        toast.error('Logo URL must be an http(s) URL or a relative path');
        setLoading(false);
        return;
      }
      const payload = {
        company_name: systemSettings.company_name,
        address: systemSettings.company_address,
        phone: systemSettings.company_phone,
        email: systemSettings.company_email,
        tax_rate: Number(systemSettings.tax_rate || 0),
        currency: systemSettings.currency,
        cr_number: systemSettings.cr_number,
        logo_url: systemSettings.logo_url,
      };
      const result = await updateSettings(payload);
      if (!result.success) throw new Error(result.error || 'Update failed');
      toast.success('System settings updated successfully');
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast.error('Failed to update system settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: t('settings.tabs.profile', 'Profile'), icon: User },
    { id: 'preferences', label: t('settings.tabs.preferences', 'Preferences'), icon: Palette },
    { id: 'security', label: t('settings.tabs.security', 'Security'), icon: Shield },
    { id: 'notifications', label: t('settings.tabs.notifications', 'Notifications'), icon: Bell },
    ...(user?.role === 'ADMIN' ? [
      { id: 'system', label: t('settings.tabs.system', 'System'), icon: Database }
    ] : [])
  ];

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'العربية', flag: '🇶🇦' }
  ];

  const themes = [
    { id: 'light', name: t('settings.theme.light', 'Light'), icon: Sun },
    { id: 'dark', name: t('settings.theme.dark', 'Dark'), icon: Moon },
    { id: 'system', name: t('settings.theme.system', 'System'), icon: Monitor }
  ];

  if (loading && activeTab === 'profile') {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-green-600" />
            {t('settings.title', 'Settings')}
          </h1>
          <p className="text-text-secondary mt-1">
            {t('settings.subtitle', 'Manage your account settings and preferences')}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <Card className="p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-100 text-green-700'
                        : 'text-text-secondary hover:bg-card-hover'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card>
              <div className="p-6 border-b border-theme-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  {t('settings.profile.title', 'Profile Information')}
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  {t('settings.profile.subtitle', 'Update your account profile information')}
                </p>
              </div>
              <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-text-secondary" />
                    </div>
                    <button
                      type="button"
                      className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700"
                      onClick={() => toast.info('Photo upload feature coming soon')}
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-text-primary">{user?.name}</h3>
                    <p className="text-text-secondary">{user?.role}</p>
                    <p className="text-sm text-text-secondary">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.profile.full_name', 'Full Name')}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.profile.email', 'Email Address')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                      <input
                        type="email"
                        className="w-full pl-10 pr-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.profile.phone', 'Phone Number')}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                      <input
                        type="tel"
                        className="w-full pl-10 pr-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.profile.department', 'Department')}
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                      <input
                        type="text"
                        className="w-full pl-10 pr-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={profileData.department}
                        onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('settings.profile.address', 'Address')}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-text-secondary w-4 h-4" />
                    <textarea
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={profileData.address}
                      onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {t('common.save_changes', 'Save Changes')}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <Card>
              <div className="p-6 border-b border-theme-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  {t('settings.preferences.title', 'Preferences')}
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  {t('settings.preferences.subtitle', 'Customize your application experience')}
                </p>
              </div>
              <div className="p-6 space-y-6">
                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('settings.preferences.language', 'Language')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${
                          preferences.language === lang.code
                            ? 'border-green-500 bg-green-50'
                            : 'border-theme-border hover:border-gray-300'
                        }`}
                        onClick={() => setPreferences({...preferences, language: lang.code})}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <div>
                          <div className="font-medium">{lang.name}</div>
                          {preferences.language === lang.code && (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              {t('common.selected', 'Selected')}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('settings.preferences.theme', 'Theme')}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {themes.map((themeOption) => {
                      const Icon = themeOption.icon;
                      return (
                        <button
                          key={themeOption.id}
                          type="button"
                          className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-colors ${
                            preferences.theme === themeOption.id
                              ? 'border-green-500 bg-green-50'
                              : 'border-theme-border hover:border-gray-300'
                          }`}
                          onClick={() => setPreferences({...preferences, theme: themeOption.id})}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-sm font-medium">{themeOption.name}</span>
                          {preferences.theme === themeOption.id && (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Other Preferences */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.preferences.date_format', 'Date Format')}
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={preferences.dateFormat}
                      onChange={(e) => setPreferences({...preferences, dateFormat: e.target.value})}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.preferences.timezone', 'Timezone')}
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={preferences.timezone}
                      onChange={(e) => setPreferences({...preferences, timezone: e.target.value})}
                    >
                      <option value="Asia/Qatar">Qatar (GMT+3)</option>
                      <option value="Asia/Dubai">Dubai (GMT+4)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handlePreferencesUpdate} disabled={loading} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {t('common.save_changes', 'Save Changes')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card>
              <div className="p-6 border-b border-theme-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  {t('settings.security.title', 'Security Settings')}
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  {t('settings.security.subtitle', 'Manage your account security')}
                </p>
              </div>
              <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium mb-1">{t('settings.security.password_requirements', 'Password Requirements')}</p>
                    <ul className="space-y-1 text-xs">
                      <li>• {t('settings.security.min_length', 'At least 8 characters long')}</li>
                      <li>• {t('settings.security.mix_case', 'Mix of uppercase and lowercase letters')}</li>
                      <li>• {t('settings.security.include_numbers', 'Include numbers and special characters')}</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('settings.security.current_password', 'Current Password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="w-full pl-10 pr-10 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('settings.security.new_password', 'New Password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="w-full pl-10 pr-10 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('settings.security.confirm_password', 'Confirm New Password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="w-full pl-10 pr-10 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {t('settings.security.change_password', 'Change Password')}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <div className="p-6 border-b border-theme-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  {t('settings.notifications.title', 'Notification Settings')}
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  {t('settings.notifications.subtitle', 'Choose what notifications you want to receive')}
                </p>
              </div>
              <div className="p-6 space-y-6">
                {Object.entries(preferences.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div>
                      <label className="text-sm font-medium text-text-secondary">
                        {t(`settings.notifications.${key}`, key.replace('_', ' ').toUpperCase())}
                      </label>
                      <p className="text-xs text-text-secondary mt-1">
                        {t(`settings.notifications.${key}_desc`, `Enable ${key.replace('_', ' ')} notifications`)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                        value ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                      onClick={() => setPreferences({
                        ...preferences,
                        notifications: {
                          ...preferences.notifications,
                          [key]: !value
                        }
                      })}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${
                          value ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}

                <div className="flex justify-end pt-4 border-t border-theme-border">
                  <Button onClick={handlePreferencesUpdate} disabled={loading} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {t('common.save_changes', 'Save Changes')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* System Tab (Admin Only) */}
          {activeTab === 'system' && user?.role === 'ADMIN' && (
            <Card>
              <div className="p-6 border-b border-theme-border">
                <h2 className="text-lg font-semibold text-text-primary">
                  {t('settings.system.title', 'System Settings')}
                </h2>
                <p className="text-text-secondary text-sm mt-1">
                  {t('settings.system.subtitle', 'Configure system-wide settings')}
                </p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.system.company_name', 'Company Name')}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={systemSettings.company_name}
                      onChange={(e) => setSystemSettings({...systemSettings, company_name: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.system.company_email', 'Company Email')}
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={systemSettings.company_email}
                      onChange={(e) => setSystemSettings({...systemSettings, company_email: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.system.company_phone', 'Company Phone')}
                    </label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={systemSettings.company_phone}
                      onChange={(e) => setSystemSettings({...systemSettings, company_phone: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.system.tax_rate', 'Tax Rate (%)')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={systemSettings.tax_rate}
                      onChange={(e) => setSystemSettings({...systemSettings, tax_rate: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.system.currency', 'Currency')}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={systemSettings.currency}
                      onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.system.cr_number', 'CR Number')}
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={systemSettings.cr_number || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, cr_number: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('settings.system.logo_url', 'Logo URL')}
                    </label>
                    <input
                      type="url"
                      className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={systemSettings.logo_url || ''}
                      onChange={(e) => setSystemSettings({...systemSettings, logo_url: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('settings.system.company_address', 'Company Address')}
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-theme-border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={systemSettings.company_address}
                    onChange={(e) => setSystemSettings({...systemSettings, company_address: e.target.value})}
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-theme-border">
                  <Button onClick={handleSystemSettingsUpdate} disabled={loading} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {t('common.save_changes', 'Save Changes')}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
