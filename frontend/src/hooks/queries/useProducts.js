import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import apiService from '../../services/api';
import toast from 'react-hot-toast';

export const useProducts = (params) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['products', params],
        queryFn: () => apiService.products.list(params).then((res) => res.data),
        placeholderData: keepPreviousData,
    });

    const createMutation = useMutation({
        mutationFn: (data) => apiService.products.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['products']);
            toast.success('Product created successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create product');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => apiService.products.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['products']);
            toast.success('Product updated successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to update product');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => apiService.products.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['products']);
            toast.success('Product deleted successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete product');
        },
    });

    return {
        ...query,
        createProduct: createMutation.mutate,
        updateProduct: updateMutation.mutate,
        deleteProduct: deleteMutation.mutate,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
};

export const useProduct = (id) => {
    return useQuery({
        queryKey: ['product', id],
        queryFn: () => apiService.products.get(id).then((res) => res.data),
        enabled: !!id,
    });
};

export const usePriceList = () => {
    return useQuery({
        queryKey: ['priceList'],
        queryFn: () => apiService.products.priceList().then((res) => res.data),
    });
};

export const useBulkUpdateProducts = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => apiService.products.bulkUpdate(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['products']);
            queryClient.invalidateQueries(['priceList']);
            toast.success('Prices updated successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to update prices');
        },
    });
};
