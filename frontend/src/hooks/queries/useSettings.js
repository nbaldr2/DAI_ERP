import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../../services/api';
import toast from 'react-hot-toast';

export const useSettings = () => {
    const queryClient = useQueryClient();

    const { data: settings, isLoading, error } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const response = await apiService.settings.get();
            return response.data?.data || {};
        },
        staleTime: 10 * 60 * 1000, // 10 minutes (settings don't change often)
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (newSettings) => apiService.settings.update(newSettings),
        onSuccess: (response) => {
            queryClient.setQueryData(['settings'], response.data?.data);
            toast.success('Settings updated successfully');
        },
        onError: (err) => {
            console.error('Failed to update settings:', err);
            toast.error(err.response?.data?.message || 'Failed to update settings');
        }
    });

    return {
        settings,
        isLoading,
        error,
        updateSettings: updateSettingsMutation.mutate,
        isUpdating: updateSettingsMutation.isPending
    };
};
