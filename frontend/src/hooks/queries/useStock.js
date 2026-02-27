import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import apiService from '../../services/api';
import toast from 'react-hot-toast';

export const useStock = (params) => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['stock', params],
        queryFn: () => apiService.stock.list(params).then((res) => res.data),
        placeholderData: keepPreviousData,
    });
};

export const useStockLedger = (params) => {
    return useQuery({
        queryKey: ['stock-ledger', params],
        queryFn: () => apiService.stock.ledgerList(params).then((res) => res.data),
        placeholderData: keepPreviousData,
    });
};

export const useStockMutation = () => {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: (id) => apiService.stock.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['stock']);
            toast.success('Item deleted successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete item');
        },
    });

    return {
        deleteStock: deleteMutation.mutate,
        isDeleting: deleteMutation.isPending,
    };
};

export const useStockSummary = (params) => {
    return useQuery({
        queryKey: ['stock-summary', params],
        queryFn: () => apiService.stock.summary(params).then((res) => res.data),
    });
};

export const useStockTrends = (params) => {
    return useQuery({
        queryKey: ['stock-trends', params],
        queryFn: () => apiService.stock.trends(params).then((res) => res.data),
    });
};

export const useStockAdjustments = (params) => {
    return useQuery({
        queryKey: ['stock-adjustments', params],
        queryFn: () => apiService.stock.adjustments.list(params).then((res) => res.data),
        placeholderData: keepPreviousData,
    });
};

export const useStockTransfers = (params) => {
    return useQuery({
        queryKey: ['stock-transfers', params],
        queryFn: () => apiService.stock.transfers.list(params).then((res) => res.data),
        placeholderData: keepPreviousData,
    });
};
