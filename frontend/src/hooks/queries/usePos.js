import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../../services/api';
import toast from 'react-hot-toast';

// ─── Session Hooks ────────────────────────────────────────────────────────

export function usePosSession() {
    return useQuery({
        queryKey: ['pos', 'session', 'current'],
        queryFn: async () => {
            const { data } = await apiService.pos.getCurrentSession();
            return data.data;
        },
        staleTime: 30000, // 30 seconds
        refetchOnWindowFocus: true,
    });
}

export function useOpenSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sessionData) => {
            const { data } = await apiService.pos.openSession(sessionData);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pos', 'session'] });
            toast.success('POS session opened');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to open session');
        },
    });
}

export function useCloseSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sessionId, closingCash }) => {
            const { data } = await apiService.pos.closeSession(sessionId, { closing_cash: closingCash });
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pos', 'session'] });
            toast.success('POS session closed');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to close session');
        },
    });
}

export function useSessionSummary(sessionId) {
    return useQuery({
        queryKey: ['pos', 'session', sessionId, 'summary'],
        queryFn: async () => {
            const { data } = await apiService.pos.getSessionSummary(sessionId);
            return data.data;
        },
        enabled: !!sessionId,
        staleTime: 60000, // 1 minute
    });
}

// ─── Products Hook ─────────────────────────────────────────────────────────

export function usePosProducts(warehouseId, search = '', category = '') {
    return useQuery({
        queryKey: ['pos', 'products', warehouseId, search, category],
        queryFn: async () => {
            const { data } = await apiService.pos.getProducts({
                warehouse_id: warehouseId,
                search: search || undefined,
                category: category || undefined,
                limit: 500, // Get all products for POS
            });
            return {
                products: data.products || [],
                categories: data.categories || [],
            };
        },
        enabled: !!warehouseId,
        staleTime: 5 * 60 * 1000, // 5 minutes - cache for offline support
        gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    });
}

// ─── Order Hooks ───────────────────────────────────────────────────────────

export function useCompleteSale() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sessionId, items, payment }) => {
            const { data } = await apiService.pos.completeSale({
                session_id: sessionId,
                items,
                payment,
            });
            return data.data;
        },
        onSuccess: (order) => {
            queryClient.invalidateQueries({ queryKey: ['pos', 'session'] });
            queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            toast.success(`Sale completed: ${order.order_number}`);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to complete sale');
        },
    });
}

export function useVoidOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderId) => {
            const { data } = await apiService.pos.voidOrder(orderId);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pos', 'session'] });
            queryClient.invalidateQueries({ queryKey: ['pos', 'products'] });
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            toast.success('Order voided');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to void order');
        },
    });
}

export function useReceipt(orderId) {
    return useQuery({
        queryKey: ['pos', 'order', orderId, 'receipt'],
        queryFn: async () => {
            const { data } = await apiService.pos.getReceipt(orderId);
            return data.data;
        },
        enabled: !!orderId,
        staleTime: Infinity, // Receipts don't change
    });
}

// ─── Park/Resume Hooks ─────────────────────────────────────────────────────

export function useParkedOrders(sessionId) {
    return useQuery({
        queryKey: ['pos', 'parked', sessionId],
        queryFn: async () => {
            const { data } = await apiService.pos.getParkedOrders({ session_id: sessionId });
            return data.data || [];
        },
        enabled: !!sessionId,
        staleTime: 30000,
    });
}

export function useParkOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sessionId, items, payment }) => {
            const { data } = await apiService.pos.parkOrder({
                session_id: sessionId,
                items,
                payment,
            });
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pos', 'parked'] });
            toast.success('Order parked');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to park order');
        },
    });
}

export function useDeleteParkedOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderId) => {
            const { data } = await apiService.pos.deleteParkedOrder(orderId);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pos', 'parked'] });
            toast.success('Parked order deleted');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete parked order');
        },
    });
}

// ─── Session Orders Hook ───────────────────────────────────────────────────

export function useSessionOrders(sessionId, page = 1, limit = 50) {
    return useQuery({
        queryKey: ['pos', 'session', sessionId, 'orders', page, limit],
        queryFn: async () => {
            const { data } = await apiService.pos.getSessionOrders(sessionId, { page, limit });
            return data;
        },
        enabled: !!sessionId,
        staleTime: 30000,
    });
}

// ─── Warehouses Hook (for session setup) ───────────────────────────────────

export function useWarehouses() {
    return useQuery({
        queryKey: ['warehouses'],
        queryFn: async () => {
            const { data } = await apiService.warehouses.list({ limit: 100 });
            return data.data || [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}