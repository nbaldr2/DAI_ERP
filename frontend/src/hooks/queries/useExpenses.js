import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import apiService from '../../services/api';
import toast from 'react-hot-toast';

export const useExpenses = (params = {}) => {
    const queryClient = useQueryClient();
    const { page = 1, limit = 50, search, category, status, date_from, date_to } = params;

    // Query Key includes all filters
    const queryKey = ['expenses', { page, limit, search, category, status, date_from, date_to }];

    // Fetch Expenses
    const {
        data,
        isLoading,
        isError,
        error,
        isFetching
    } = useQuery({
        queryKey,
        queryFn: () => apiService.expenses.list(params),
        placeholderData: keepPreviousData,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (newExpense) => apiService.expenses.create(newExpense),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success('Expense created successfully');
        },
        onError: (error) => {
            console.error('Create expense error:', error);
            toast.error(error.response?.data?.message || 'Failed to create expense');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => apiService.expenses.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success('Expense updated successfully');
        },
        onError: (error) => {
            console.error('Update expense error:', error);
            toast.error(error.response?.data?.message || 'Failed to update expense');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => apiService.expenses.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            toast.success('Expense deleted successfully');
        },
        onError: (error) => {
            console.error('Delete expense error:', error);
            toast.error(error.response?.data?.message || 'Failed to delete expense');
        }
    });

    return {
        // Data
        data: data?.data,
        isLoading,
        isError,
        error,
        isFetching,

        // Mutations
        createExpense: createMutation.mutate,
        updateExpense: updateMutation.mutate,
        deleteExpense: deleteMutation.mutate,

        // Loading States
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending
    };
};
