import { container } from './di/Container.js';
import { DatabaseContext } from './database/DatabaseContext.js';
import { EventBus } from './events/EventBus.js';
import { CircuitBreakerFactory } from './api/CircuitBreaker.js';
import { MetalPriceApiClient } from './api/MetalPriceApiClient.js';
import { ExchangeRateApiClient } from './api/ExchangeRateApiClient.js';

// Repositories
import { ReceiptRepository } from './database/repositories/ReceiptRepository.js';
import { QuotationRepository } from './database/repositories/QuotationRepository.js';
import { ProductRepository } from './database/repositories/ProductRepository.js';
import { ClientRepository } from './database/repositories/ClientRepository.js';

// Services
import { PricingService } from '../application/services/PricingService.js';
import { PDFGeneratorService } from '../application/services/PDFGeneratorService.js';
import { AuthenticationService } from '../application/services/AuthenticationService.js';
import { NotificationService } from '../application/services/NotificationService.js';
import { ValidationService } from '../application/services/ValidationService.js';

// Use Cases
import { CreateReceiptUseCase } from '../application/use-cases/CreateReceiptUseCase.js';
import { CreateQuotationUseCase } from '../application/use-cases/CreateQuotationUseCase.js';
import { ProcessPaymentUseCase } from '../application/use-cases/ProcessPaymentUseCase.js';
import { CalculatePriceUseCase } from '../application/use-cases/CalculatePriceUseCase.js';
import { AuthenticateUserUseCase } from '../application/use-cases/AuthenticateUserUseCase.js';

// Event Handlers
import { eventHandlers } from './events/handlers/index.js';

/**
 * Configure and setup the dependency injection container
 */
export function configureContainer(): void {
  // Infrastructure Services
  container.registerSingleton(DatabaseContext, () => new DatabaseContext());
  container.registerSingleton(EventBus, () => new EventBus());
  container.registerSingleton(CircuitBreakerFactory, () => new CircuitBreakerFactory());
  
  // API Clients
  container.registerSingleton(MetalPriceApiClient, () => {
    const circuitBreakerFactory = container.resolve(CircuitBreakerFactory);
    return new MetalPriceApiClient(circuitBreakerFactory);
  });
  
  container.registerSingleton(ExchangeRateApiClient, () => {
    const circuitBreakerFactory = container.resolve(CircuitBreakerFactory);
    return new ExchangeRateApiClient(circuitBreakerFactory);
  });

  // Repositories
  container.registerSingleton('IReceiptRepository', () => {
    const db = container.resolve(DatabaseContext);
    return new ReceiptRepository(db);
  });
  
  container.registerSingleton('IQuotationRepository', () => {
    const db = container.resolve(DatabaseContext);
    return new QuotationRepository(db);
  });
  
  container.registerSingleton('IProductRepository', () => {
    const db = container.resolve(DatabaseContext);
    return new ProductRepository(db);
  });
  
  container.registerSingleton('IClientRepository', () => {
    const db = container.resolve(DatabaseContext);
    return new ClientRepository(db);
  });

  // Application Services
  container.registerSingleton(PricingService, () => {
    const metalPriceClient = container.resolve(MetalPriceApiClient);
    return new PricingService(metalPriceClient);
  });
  
  container.registerSingleton(PDFGeneratorService, () => new PDFGeneratorService());
  container.registerSingleton(AuthenticationService, () => new AuthenticationService());
  
  container.registerSingleton(NotificationService, () => {
    const eventBus = container.resolve(EventBus);
    return new NotificationService(eventBus);
  });
  
  container.registerSingleton(ValidationService, () => new ValidationService());

  // Use Cases
  container.registerTransient(CreateReceiptUseCase, () => {
    const receiptRepository = container.resolve('IReceiptRepository');
    const clientRepository = container.resolve('IClientRepository');
    const eventBus = container.resolve(EventBus);
    return new CreateReceiptUseCase(receiptRepository, clientRepository, eventBus);
  });
  
  container.registerTransient(CreateQuotationUseCase, () => {
    const quotationRepository = container.resolve('IQuotationRepository');
    const clientRepository = container.resolve('IClientRepository');
    const eventBus = container.resolve(EventBus);
    return new CreateQuotationUseCase(quotationRepository, clientRepository, eventBus);
  });
  
  container.registerTransient(ProcessPaymentUseCase, () => {
    const receiptRepository = container.resolve('IReceiptRepository');
    const eventBus = container.resolve(EventBus);
    return new ProcessPaymentUseCase(receiptRepository, eventBus);
  });
  
  container.registerTransient(CalculatePriceUseCase, () => {
    const pricingService = container.resolve(PricingService);
    return new CalculatePriceUseCase(pricingService);
  });
  
  container.registerTransient(AuthenticateUserUseCase, () => {
    const authService = container.resolve(AuthenticationService);
    return new AuthenticateUserUseCase(authService);
  });

  // Event Handlers
  const eventBus = container.resolve(EventBus);
  
  // Register event handlers
  eventHandlers.forEach(HandlerClass => {
    const handler = container.resolve(HandlerClass);
    
    // Subscribe to events based on handler class name
    if (HandlerClass.name.includes('ReceiptCreated')) {
      eventBus.subscribe('receipt.created', handler);
    } else if (HandlerClass.name.includes('ReceiptCompleted')) {
      eventBus.subscribe('receipt.completed', handler);
    } else if (HandlerClass.name.includes('QuotationAccepted')) {
      eventBus.subscribe('quotation.accepted', handler);
    } else if (HandlerClass.name.includes('PaymentProcessed')) {
      eventBus.subscribe('payment.processed', handler);
    } else if (HandlerClass.name.includes('ClientRegistered')) {
      eventBus.subscribe('client.registered', handler);
    } else if (HandlerClass.name.includes('ProductStockLow')) {
      eventBus.subscribe('product.stock.low', handler);
    }
  });
}

/**
 * Initialize the application services
 */
export async function initializeServices(): Promise<void> {
  try {
    // Configure container
    configureContainer();
    
    // Initialize database
    const db = container.resolve(DatabaseContext);
    await db.open();
    
    // Run any pending migrations
    // await db.runMigrations(migrations);
    
    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Cleanup services on application shutdown
 */
export async function cleanupServices(): Promise<void> {
  try {
    // Close database connection
    const db = container.resolve(DatabaseContext);
    await db.close();
    
    // Dispose container
    await container.dispose();
    
    console.log('Services cleaned up successfully');
  } catch (error) {
    console.error('Error during service cleanup:', error);
  }
}
