import { create } from 'zustand';
import { Receipt } from '../../core/domain/entities/Receipt.js';
import { IReceiptRepository, ReceiptFilter } from '../../core/domain/repositories/IReceiptRepository.js';
import { CreateReceiptUseCase, ProcessPaymentUseCase } from '../../core/application/use-cases/index.js';
import { container } from '../../core/infrastructure/di/index.js';

export interface ReceiptState {
  // State
  receipts: Receipt[];
  currentReceipt: Receipt | null;
  isLoading: boolean;
  error: string | null;
  filters: ReceiptFilter;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  
  // Actions
  loadReceipts: (filters?: ReceiptFilter) => Promise<void>;
  loadMoreReceipts: () => Promise<void>;
  getReceipt: (id: string) => Promise<Receipt | null>;
  createReceipt: (data: any) => Promise<Receipt | null>;
  updateReceipt: (id: string, updates: Partial<Receipt>) => Promise<Receipt | null>;
  deleteReceipt: (id: string) => Promise<boolean>;
  processPayment: (receiptId: string, paymentData: any) => Promise<boolean>;
  completeReceipt: (id: string) => Promise<boolean>;
  cancelReceipt: (id: string) => Promise<boolean>;
  setFilters: (filters: Partial<ReceiptFilter>) => void;
  clearFilters: () => void;
  setCurrentReceipt: (receipt: Receipt | null) => void;
  clearError: () => void;
  refreshReceipts: () => Promise<void>;
}

export const useReceiptStore = create<ReceiptState>((set, get) => {
  const receiptRepository = container.resolve<IReceiptRepository>('IReceiptRepository');
  const createReceiptUseCase = container.resolve(CreateReceiptUseCase);
  const processPaymentUseCase = container.resolve(ProcessPaymentUseCase);

  return {
    // Initial state
    receipts: [],
    currentReceipt: null,
    isLoading: false,
    error: null,
    filters: {},
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      hasMore: false,
    },

    // Actions
    loadReceipts: async (filters?: ReceiptFilter) => {
      set({ isLoading: true, error: null });
      
      try {
        const currentFilters = filters || get().filters;
        const { pagination } = get();
        
        const result = await receiptRepository.findPaginated(
          currentFilters,
          1, // Reset to first page
          pagination.limit,
          'createdAt',
          'desc'
        );

        set({
          receipts: result.data,
          filters: currentFilters,
          pagination: {
            page: 1,
            limit: pagination.limit,
            total: result.total,
            hasMore: result.page < result.pages,
          },
          isLoading: false,
        });
      } catch (error: any) {
        set({
          error: error.message || 'Failed to load receipts',
          isLoading: false,
        });
      }
    },

    loadMoreReceipts: async () => {
      const { pagination, filters, receipts, isLoading } = get();
      
      if (isLoading || !pagination.hasMore) {
        return;
      }

      set({ isLoading: true });
      
      try {
        const nextPage = pagination.page + 1;
        
        const result = await receiptRepository.findPaginated(
          filters,
          nextPage,
          pagination.limit,
          'createdAt',
          'desc'
        );

        set({
          receipts: [...receipts, ...result.data],
          pagination: {
            ...pagination,
            page: nextPage,
            hasMore: nextPage < result.pages,
          },
          isLoading: false,
        });
      } catch (error: any) {
        set({
          error: error.message || 'Failed to load more receipts',
          isLoading: false,
        });
      }
    },

    getReceipt: async (id: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const receipt = await receiptRepository.findById(id);
        
        set({
          currentReceipt: receipt,
          isLoading: false,
        });
        
        return receipt;
      } catch (error: any) {
        set({
          error: error.message || 'Failed to load receipt',
          isLoading: false,
        });
        return null;
      }
    },

    createReceipt: async (data: any) => {
      set({ isLoading: true, error: null });
      
      try {
        const result = await createReceiptUseCase.execute(data);
        
        // Add new receipt to the beginning of the list
        const { receipts } = get();
        set({
          receipts: [result.receipt, ...receipts],
          currentReceipt: result.receipt,
          isLoading: false,
        });
        
        return result.receipt;
      } catch (error: any) {
        set({
          error: error.message || 'Failed to create receipt',
          isLoading: false,
        });
        return null;
      }
    },

    updateReceipt: async (id: string, updates: Partial<Receipt>) => {
      set({ isLoading: true, error: null });
      
      try {
        const updatedReceipt = await receiptRepository.update(id, updates);
        
        if (updatedReceipt) {
          // Update in the receipts list
          const { receipts, currentReceipt } = get();
          const updatedReceipts = receipts.map(receipt =>
            receipt.id === id ? updatedReceipt : receipt
          );
          
          set({
            receipts: updatedReceipts,
            currentReceipt: currentReceipt?.id === id ? updatedReceipt : currentReceipt,
            isLoading: false,
          });
        }
        
        return updatedReceipt;
      } catch (error: any) {
        set({
          error: error.message || 'Failed to update receipt',
          isLoading: false,
        });
        return null;
      }
    },

    deleteReceipt: async (id: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const success = await receiptRepository.delete(id);
        
        if (success) {
          // Remove from receipts list
          const { receipts, currentReceipt } = get();
          const updatedReceipts = receipts.filter(receipt => receipt.id !== id);
          
          set({
            receipts: updatedReceipts,
            currentReceipt: currentReceipt?.id === id ? null : currentReceipt,
            isLoading: false,
          });
        }
        
        return success;
      } catch (error: any) {
        set({
          error: error.message || 'Failed to delete receipt',
          isLoading: false,
        });
        return false;
      }
    },

    processPayment: async (receiptId: string, paymentData: any) => {
      set({ isLoading: true, error: null });
      
      try {
        const result = await processPaymentUseCase.execute({
          receiptId,
          ...paymentData,
        });
        
        // Refresh the receipt to get updated payment information
        const updatedReceipt = await receiptRepository.findById(receiptId);
        
        if (updatedReceipt) {
          // Update in the receipts list
          const { receipts, currentReceipt } = get();
          const updatedReceipts = receipts.map(receipt =>
            receipt.id === receiptId ? updatedReceipt : receipt
          );
          
          set({
            receipts: updatedReceipts,
            currentReceipt: currentReceipt?.id === receiptId ? updatedReceipt : currentReceipt,
            isLoading: false,
          });
        }
        
        return true;
      } catch (error: any) {
        set({
          error: error.message || 'Failed to process payment',
          isLoading: false,
        });
        return false;
      }
    },

    completeReceipt: async (id: string) => {
      const receipt = get().receipts.find(r => r.id === id);
      if (!receipt) {
        set({ error: 'Receipt not found' });
        return false;
      }

      try {
        receipt.markAsCompleted();
        return get().updateReceipt(id, { status: receipt.status, completedAt: receipt.completedAt }) !== null;
      } catch (error: any) {
        set({ error: error.message || 'Failed to complete receipt' });
        return false;
      }
    },

    cancelReceipt: async (id: string) => {
      const receipt = get().receipts.find(r => r.id === id);
      if (!receipt) {
        set({ error: 'Receipt not found' });
        return false;
      }

      try {
        receipt.cancel();
        return get().updateReceipt(id, { status: receipt.status }) !== null;
      } catch (error: any) {
        set({ error: error.message || 'Failed to cancel receipt' });
        return false;
      }
    },

    setFilters: (filters: Partial<ReceiptFilter>) => {
      const currentFilters = get().filters;
      const newFilters = { ...currentFilters, ...filters };
      
      set({ filters: newFilters });
      
      // Auto-reload with new filters
      get().loadReceipts(newFilters);
    },

    clearFilters: () => {
      set({ filters: {} });
      get().loadReceipts({});
    },

    setCurrentReceipt: (receipt: Receipt | null) => {
      set({ currentReceipt: receipt });
    },

    clearError: () => {
      set({ error: null });
    },

    refreshReceipts: async () => {
      const { filters } = get();
      await get().loadReceipts(filters);
    },
  };
});
