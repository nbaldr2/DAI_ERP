import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  Save,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  Globe,
  CreditCard,
  Camera,
  AlertCircle
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const SystemSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    company_name: '',
    email: '',
    phone: '',
    address: '',
    pobox: '',
    cr_number: '',
    logo_url: '',
    language: 'en',
    currency: 'QAR'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.systemSettings.get();
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      const response = await apiService.systemSettings.update(settings);
      
      if (response.data.success) {
        toast.success('System settings updated successfully');
        // Reload settings to get updated data with timestamps
        await loadSettings();
      }
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast.error('Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading system settings..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">System Settings</h1>
        <p className="text-text-secondary mt-1">Manage your company information and system preferences</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary flex items-center">
                <Building className="w-5 h-5 mr-2 text-primary-600" />
                Company Information
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={settings.company_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                  <input
                    type="email"
                    name="email"
                    value={settings.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Phone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                  <input
                    type="text"
                    name="phone"
                    value={settings.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Address *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-text-secondary w-4 h-4" />
                  <textarea
                    name="address"
                    value={settings.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary flex items-center">
                <FileText className="w-5 h-5 mr-2 text-primary-600" />
                Additional Information
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  PO Box *
                </label>
                <input
                  type="text"
                  name="pobox"
                  value={settings.pobox}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  CR Number *
                </label>
                <input
                  type="text"
                  name="cr_number"
                  value={settings.cr_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Logo URL
                </label>
                <div className="flex items-start space-x-3">
                  <div className="flex-1">
                    <div className="relative">
                      <Camera className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                      <input
                        type="text"
                        name="logo_url"
                        value={settings.logo_url || ''}
                        onChange={handleInputChange}
                        placeholder="https://example.com/logo.png"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    {settings.logo_url && (
                      <div className="mt-2">
                        <img 
                          src={settings.logo_url} 
                          alt="Company Logo Preview" 
                          className="h-16 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Language
                  </label>
                  <select
                    name="language"
                    value={settings.language}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    <CreditCard className="w-4 h-4 inline mr-1" />
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={settings.currency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="QAR">QAR (Qatari Riyal)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>
      </form>
      
      {user?.role !== 'ADMIN' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800">
              Only administrators can modify system settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;