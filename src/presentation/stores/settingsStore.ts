import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BusinessSettings } from '../../shared/types/index.js';
import { DatabaseContext } from '../../core/infrastructure/database/DatabaseContext.js';
import { container } from '../../core/infrastructure/di/index.js';

export interface AppSettings {
  // UI Settings
  theme: 'light' | 'dark' | 'auto';
  language: string;
  dateFormat: 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';
  timeFormat: '12h' | '24h';
  currency: string;
  numberFormat: 'en-US' | 'en-GB' | 'de-DE' | 'fr-FR';
  
  // Business Settings
  business: BusinessSettings;
  
  // Notification Settings
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
    lowStock: boolean;
    quotationExpiry: boolean;
    paymentReminders: boolean;
  };
  
  // Backup Settings
  backup: {
    autoBackup: boolean;
    backupInterval: 'daily' | 'weekly' | 'monthly';
    maxBackups: number;
    cloudBackup: boolean;
  };
  
  // Receipt Settings
  receipt: {
    defaultTaxRate: number;
    defaultTaxLabel: string;
    includeHeader: boolean;
    includeLogo: boolean;
    includeFooter: boolean;
    fontSize: 'small' | 'medium' | 'large';
    theme: 'default' | 'minimal' | 'elegant';
  };
  
  // Quotation Settings
  quotation: {
    defaultValidityDays: number;
    includeHeader: boolean;
    includeLogo: boolean;
    includeFooter: boolean;
    fontSize: 'small' | 'medium' | 'large';
    theme: 'default' | 'minimal' | 'elegant';
  };
  
  // Pricing Settings
  pricing: {
    defaultMarkup: number;
    metalPricesProvider: string;
    autoUpdatePrices: boolean;
    priceUpdateInterval: number; // hours
  };
}

export interface SettingsState {
  // State
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  updateBusinessSettings: (updates: Partial<BusinessSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: () => AppSettings;
  importSettings: (settings: AppSettings) => Promise<void>;
  clearError: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'auto',
  language: 'en',
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '12h',
  currency: 'USD',
  numberFormat: 'en-US',
  
  business: {
    name: 'CiaoCiao Jewelry',
    address: '123 Main Street, City, State 12345',
    phone: '(555) 123-4567',
    email: 'info@ciaociaojewelry.com',
    website: 'www.ciaociaojewelry.com',
    currency: 'USD',
    taxRate: 0.08,
    taxLabel: 'Sales Tax',
  },
  
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    lowStock: true,
    quotationExpiry: true,
    paymentReminders: true,
  },
  
  backup: {
    autoBackup: true,
    backupInterval: 'weekly',
    maxBackups: 10,
    cloudBackup: false,
  },
  
  receipt: {
    defaultTaxRate: 0.08,
    defaultTaxLabel: 'Sales Tax',
    includeHeader: true,
    includeLogo: false,
    includeFooter: true,
    fontSize: 'medium',
    theme: 'default',
  },
  
  quotation: {
    defaultValidityDays: 30,
    includeHeader: true,
    includeLogo: false,
    includeFooter: true,
    fontSize: 'medium',
    theme: 'default',
  },
  
  pricing: {
    defaultMarkup: 50,
    metalPricesProvider: 'metals-api',
    autoUpdatePrices: true,
    priceUpdateInterval: 24, // 24 hours
  },
};

export const useSettingsStore = create<SettingsState>()(  persist(
    (set, get) => {
      const db = container.resolve(DatabaseContext);

      return {
        // Initial state
        settings: defaultSettings,
        isLoading: false,
        error: null,

        // Actions
        loadSettings: async () => {
          set({ isLoading: true, error: null });
          
          try {
            // Load settings from database
            const savedSettings = await db.getSetting('appSettings', defaultSettings);
            
            set({
              settings: { ...defaultSettings, ...savedSettings },
              isLoading: false,
            });
          } catch (error: any) {
            set({
              error: error.message || 'Failed to load settings',
              isLoading: false,
            });
          }
        },

        updateSettings: async (updates: Partial<AppSettings>) => {
          set({ isLoading: true, error: null });
          
          try {
            const currentSettings = get().settings;
            const newSettings = { ...currentSettings, ...updates };
            
            // Save to database
            await db.setSetting('appSettings', newSettings);
            
            set({
              settings: newSettings,
              isLoading: false,
            });
          } catch (error: any) {
            set({
              error: error.message || 'Failed to update settings',
              isLoading: false,
            });
          }
        },

        updateBusinessSettings: async (updates: Partial<BusinessSettings>) => {
          const currentSettings = get().settings;
          const newBusinessSettings = { ...currentSettings.business, ...updates };
          
          await get().updateSettings({
            business: newBusinessSettings,
          });
        },

        resetSettings: async () => {
          set({ isLoading: true, error: null });
          
          try {
            await db.setSetting('appSettings', defaultSettings);
            
            set({
              settings: defaultSettings,
              isLoading: false,
            });
          } catch (error: any) {
            set({
              error: error.message || 'Failed to reset settings',
              isLoading: false,
            });
          }
        },

        exportSettings: () => {
          return get().settings;
        },

        importSettings: async (settings: AppSettings) => {
          set({ isLoading: true, error: null });
          
          try {
            // Validate settings structure
            const validatedSettings = { ...defaultSettings, ...settings };
            
            await db.setSetting('appSettings', validatedSettings);
            
            set({
              settings: validatedSettings,
              isLoading: false,
            });
          } catch (error: any) {
            set({
              error: error.message || 'Failed to import settings',
              isLoading: false,
            });
          }
        },

        clearError: () => {
          set({ error: null });
        },
      };
    },
    {
      name: 'settings-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);

// Auto-load settings on store initialization
if (typeof window !== 'undefined') {
  const loadInitialSettings = async () => {
    const store = useSettingsStore.getState();
    await store.loadSettings();
  };
  
  loadInitialSettings();
}
