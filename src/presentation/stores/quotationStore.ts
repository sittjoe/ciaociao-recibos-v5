import { create } from 'zustand';
import { Quotation } from '../../core/domain/entities/Quotation.js';
import { IQuotationRepository, QuotationFilter } from '../../core/domain/repositories/IQuotationRepository.js';
import { CreateQuotationUseCase } from '../../core/application/use-cases/index.js';
import { container } from '../../core/infrastructure/di/index.js';

export interface QuotationState {
  // State
  quotations: Quotation[];
  currentQuotation: Quotation | null;
  isLoading: boolean;
  error: string | null;
  filters: QuotationFilter;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  
  // Actions
  loadQuotations: (filters?: QuotationFilter) => Promise<void>;
  loadMoreQuotations: () => Promise<void>;
  getQuotation: (id: string) => Promise<Quotation | null>;
  createQuotation: (data: any) => Promise<Quotation | null>;
  updateQuotation: (id: string, updates: Partial<Quotation>) => Promise<Quotation | null>;
  deleteQuotation: (id: string) => Promise<boolean>;
  sendQuotation: (id: string) => Promise<boolean>;
  acceptQuotation: (id: string) => Promise<boolean>;
  declineQuotation: (id: string) => Promise<boolean>;
  convertToReceipt: (id: string, receiptId: string) => Promise<boolean>;
  extendValidity: (id: string, days: number) => Promise<boolean>;
  applyDiscount: (id: string, discount: any) => Promise<boolean>;
  setFilters: (filters: Partial<QuotationFilter>) => void;
  clearFilters: () => void;
  setCurrentQuotation: (quotation: Quotation | null) => void;
  clearError: () => void;
  refreshQuotations: () => Promise<void>;
  getExpiredQuotations: () => Promise<Quotation[]>;
}

export const useQuotationStore = create<QuotationState>((set, get) => {
  const quotationRepository = container.resolve<IQuotationRepository>('IQuotationRepository');
  const createQuotationUseCase = container.resolve(CreateQuotationUseCase);

  return {
    // Initial state
    quotations: [],
    currentQuotation: null,
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
    loadQuotations: async (filters?: QuotationFilter) => {
      set({ isLoading: true, error: null });
      
      try {
        const currentFilters = filters || get().filters;
        const { pagination } = get();
        
        const result = await quotationRepository.findPaginated(
          currentFilters,
          1, // Reset to first page
          pagination.limit,
          'createdAt',
          'desc'
        );

        set({
          quotations: result.data,
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
          error: error.message || 'Failed to load quotations',
          isLoading: false,
        });
      }
    },

    loadMoreQuotations: async () => {
      const { pagination, filters, quotations, isLoading } = get();
      
      if (isLoading || !pagination.hasMore) {
        return;
      }

      set({ isLoading: true });
      
      try {
        const nextPage = pagination.page + 1;
        
        const result = await quotationRepository.findPaginated(
          filters,
          nextPage,
          pagination.limit,
          'createdAt',
          'desc'
        );

        set({
          quotations: [...quotations, ...result.data],
          pagination: {
            ...pagination,
            page: nextPage,
            hasMore: nextPage < result.pages,
          },
          isLoading: false,
        });
      } catch (error: any) {
        set({
          error: error.message || 'Failed to load more quotations',
          isLoading: false,
        });
      }
    },

    getQuotation: async (id: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const quotation = await quotationRepository.findById(id);
        
        set({
          currentQuotation: quotation,
          isLoading: false,
        });
        
        return quotation;
      } catch (error: any) {
        set({
          error: error.message || 'Failed to load quotation',
          isLoading: false,
        });
        return null;
      }
    },

    createQuotation: async (data: any) => {
      set({ isLoading: true, error: null });
      
      try {
        const result = await createQuotationUseCase.execute(data);
        
        // Add new quotation to the beginning of the list
        const { quotations } = get();
        set({
          quotations: [result.quotation, ...quotations],
          currentQuotation: result.quotation,
          isLoading: false,
        });
        
        return result.quotation;
      } catch (error: any) {
        set({
          error: error.message || 'Failed to create quotation',
          isLoading: false,
        });
        return null;
      }
    },

    updateQuotation: async (id: string, updates: Partial<Quotation>) => {
      set({ isLoading: true, error: null });
      
      try {
        const updatedQuotation = await quotationRepository.update(id, updates);
        
        if (updatedQuotation) {
          // Update in the quotations list
          const { quotations, currentQuotation } = get();
          const updatedQuotations = quotations.map(quotation =>
            quotation.id === id ? updatedQuotation : quotation
          );
          
          set({
            quotations: updatedQuotations,
            currentQuotation: currentQuotation?.id === id ? updatedQuotation : currentQuotation,
            isLoading: false,
          });
        }
        
        return updatedQuotation;
      } catch (error: any) {
        set({
          error: error.message || 'Failed to update quotation',
          isLoading: false,
        });
        return null;
      }
    },

    deleteQuotation: async (id: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const success = await quotationRepository.delete(id);
        
        if (success) {
          // Remove from quotations list
          const { quotations, currentQuotation } = get();
          const updatedQuotations = quotations.filter(quotation => quotation.id !== id);
          
          set({
            quotations: updatedQuotations,
            currentQuotation: currentQuotation?.id === id ? null : currentQuotation,
            isLoading: false,
          });
        }
        
        return success;
      } catch (error: any) {
        set({
          error: error.message || 'Failed to delete quotation',
          isLoading: false,
        });
        return false;
      }
    },

    sendQuotation: async (id: string) => {
      const quotation = get().quotations.find(q => q.id === id);
      if (!quotation) {
        set({ error: 'Quotation not found' });
        return false;
      }

      try {
        quotation.send();
        return get().updateQuotation(id, { 
          status: quotation.status, 
          sentAt: quotation.sentAt 
        }) !== null;
      } catch (error: any) {
        set({ error: error.message || 'Failed to send quotation' });
        return false;
      }
    },

    acceptQuotation: async (id: string) => {
      const quotation = get().quotations.find(q => q.id === id);
      if (!quotation) {
        set({ error: 'Quotation not found' });
        return false;
      }

      try {
        quotation.accept();
        return get().updateQuotation(id, { 
          status: quotation.status, 
          respondedAt: quotation.respondedAt 
        }) !== null;
      } catch (error: any) {
        set({ error: error.message || 'Failed to accept quotation' });
        return false;
      }
    },

    declineQuotation: async (id: string) => {
      const quotation = get().quotations.find(q => q.id === id);
      if (!quotation) {
        set({ error: 'Quotation not found' });
        return false;
      }

      try {
        quotation.decline();
        return get().updateQuotation(id, { 
          status: quotation.status, 
          respondedAt: quotation.respondedAt 
        }) !== null;
      } catch (error: any) {
        set({ error: error.message || 'Failed to decline quotation' });
        return false;
      }
    },

    convertToReceipt: async (id: string, receiptId: string) => {
      const quotation = get().quotations.find(q => q.id === id);
      if (!quotation) {
        set({ error: 'Quotation not found' });
        return false;
      }

      try {
        quotation.convertToReceipt(receiptId);
        return get().updateQuotation(id, { 
          status: quotation.status, 
          convertedReceiptId: quotation.convertedReceiptId 
        }) !== null;
      } catch (error: any) {
        set({ error: error.message || 'Failed to convert quotation' });
        return false;
      }
    },

    extendValidity: async (id: string, days: number) => {
      const quotation = get().quotations.find(q => q.id === id);
      if (!quotation) {
        set({ error: 'Quotation not found' });
        return false;
      }

      try {
        quotation.extendValidity(days);
        return get().updateQuotation(id, { 
          validUntil: quotation.validUntil 
        }) !== null;
      } catch (error: any) {
        set({ error: error.message || 'Failed to extend quotation validity' });
        return false;
      }
    },

    applyDiscount: async (id: string, discount: any) => {
      const quotation = get().quotations.find(q => q.id === id);
      if (!quotation) {
        set({ error: 'Quotation not found' });
        return false;
      }

      try {
        quotation.applyDiscount(discount);
        return get().updateQuotation(id, { 
          discount: quotation.discount,
          discountAmount: quotation.discountAmount,
          total: quotation.total
        }) !== null;
      } catch (error: any) {
        set({ error: error.message || 'Failed to apply discount' });
        return false;
      }
    },

    setFilters: (filters: Partial<QuotationFilter>) => {
      const currentFilters = get().filters;
      const newFilters = { ...currentFilters, ...filters };
      
      set({ filters: newFilters });
      
      // Auto-reload with new filters
      get().loadQuotations(newFilters);
    },

    clearFilters: () => {
      set({ filters: {} });
      get().loadQuotations({});
    },

    setCurrentQuotation: (quotation: Quotation | null) => {
      set({ currentQuotation: quotation });
    },

    clearError: () => {
      set({ error: null });
    },

    refreshQuotations: async () => {
      const { filters } = get();
      await get().loadQuotations(filters);
    },

    getExpiredQuotations: async () => {
      try {
        return await quotationRepository.findExpiredQuotations();
      } catch (error: any) {
        set({ error: error.message || 'Failed to load expired quotations' });
        return [];
      }
    },
  };
});
