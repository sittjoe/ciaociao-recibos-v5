import 'reflect-metadata';
import {
  ServiceDescriptor,
  ServiceLifecycle,
  ServiceScope,
  Constructor,
  Disposable,
  INJECTABLE_METADATA,
  INJECT_METADATA,
} from './types.js';

export class DIContainer {
  private services = new Map<string | symbol | Constructor<any>, ServiceDescriptor>();
  private singletons = new Map<string | symbol | Constructor<any>, any>();
  private scopes = new Map<string, ServiceScope>();
  private currentScope?: ServiceScope;

  /**
   * Register a service with the container
   */
  register<T>(
    token: string | symbol | Constructor<T>,
    descriptor: Partial<ServiceDescriptor<T>>
  ): this {
    const fullDescriptor: ServiceDescriptor<T> = {
      token,
      lifecycle: 'transient',
      ...descriptor,
    };

    this.services.set(token, fullDescriptor);
    return this;
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    token: string | symbol | Constructor<T>,
    factory?: (...args: any[]) => T,
    constructor?: Constructor<T>
  ): this {
    return this.register(token, {
      factory,
      constructor,
      lifecycle: 'singleton',
    });
  }

  /**
   * Register a transient service
   */
  registerTransient<T>(
    token: string | symbol | Constructor<T>,
    factory?: (...args: any[]) => T,
    constructor?: Constructor<T>
  ): this {
    return this.register(token, {
      factory,
      constructor,
      lifecycle: 'transient',
    });
  }

  /**
   * Register a scoped service
   */
  registerScoped<T>(
    token: string | symbol | Constructor<T>,
    factory?: (...args: any[]) => T,
    constructor?: Constructor<T>
  ): this {
    return this.register(token, {
      factory,
      constructor,
      lifecycle: 'scoped',
    });
  }

  /**
   * Register a service instance directly
   */
  registerInstance<T>(token: string | symbol | Constructor<T>, instance: T): this {
    return this.register(token, {
      instance,
      lifecycle: 'singleton',
    });
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(token: string | symbol | Constructor<T>): T {
    const descriptor = this.services.get(token);
    if (!descriptor) {
      // Try to auto-register if it's a constructor with metadata
      if (typeof token === 'function') {
        const metadata = Reflect.getMetadata(INJECTABLE_METADATA, token);
        if (metadata) {
          this.register(token, {
            constructor: token as Constructor<T>,
            lifecycle: metadata.lifecycle,
          });
          return this.resolve(token);
        }
      }
      throw new Error(`Service not registered: ${String(token)}`);
    }

    return this.createInstance(descriptor);
  }

  /**
   * Create a new scope
   */
  createScope(id?: string): ServiceScope {
    const scopeId = id || `scope-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const scope: ServiceScope = {
      id: scopeId,
      instances: new Map(),
      dispose: async () => {
        for (const instance of scope.instances.values()) {
          if (this.isDisposable(instance)) {
            await instance.dispose();
          }
        }
        scope.instances.clear();
        this.scopes.delete(scopeId);
      },
    };

    this.scopes.set(scopeId, scope);
    return scope;
  }

  /**
   * Execute code within a scope
   */
  async withScope<T>(scopeId: string, fn: () => Promise<T>): Promise<T> {
    const scope = this.scopes.get(scopeId) || this.createScope(scopeId);
    const previousScope = this.currentScope;
    this.currentScope = scope;

    try {
      return await fn();
    } finally {
      this.currentScope = previousScope;
    }
  }

  /**
   * Dispose all resources
   */
  async dispose(): Promise<void> {
    // Dispose all scopes
    for (const scope of this.scopes.values()) {
      await scope.dispose();
    }

    // Dispose singletons
    for (const instance of this.singletons.values()) {
      if (this.isDisposable(instance)) {
        await instance.dispose();
      }
    }

    this.services.clear();
    this.singletons.clear();
    this.scopes.clear();
  }

  /**
   * Check if a service is registered
   */
  has(token: string | symbol | Constructor<any>): boolean {
    return this.services.has(token);
  }

  private createInstance<T>(descriptor: ServiceDescriptor<T>): T {
    // Return existing instance for singleton
    if (descriptor.lifecycle === 'singleton') {
      if (this.singletons.has(descriptor.token)) {
        return this.singletons.get(descriptor.token);
      }
    }

    // Return scoped instance
    if (descriptor.lifecycle === 'scoped' && this.currentScope) {
      if (this.currentScope.instances.has(descriptor.token)) {
        return this.currentScope.instances.get(descriptor.token);
      }
    }

    // Create new instance
    let instance: T;

    if (descriptor.instance) {
      instance = descriptor.instance;
    } else if (descriptor.factory) {
      const dependencies = this.resolveDependencies(descriptor);
      instance = descriptor.factory(...dependencies);
    } else if (descriptor.constructor) {
      const dependencies = this.resolveDependencies(descriptor);
      instance = new descriptor.constructor(...dependencies);
    } else {
      throw new Error(`No factory, constructor, or instance provided for ${String(descriptor.token)}`);
    }

    // Store based on lifecycle
    if (descriptor.lifecycle === 'singleton') {
      this.singletons.set(descriptor.token, instance);
    } else if (descriptor.lifecycle === 'scoped' && this.currentScope) {
      this.currentScope.instances.set(descriptor.token, instance);
    }

    return instance;
  }

  private resolveDependencies(descriptor: ServiceDescriptor): any[] {
    const dependencies: any[] = [];

    if (descriptor.dependencies) {
      for (const dep of descriptor.dependencies) {
        dependencies.push(this.resolve(dep));
      }
    } else if (descriptor.constructor) {
      // Use reflection to get constructor dependencies
      const paramTypes = Reflect.getMetadata('design:paramtypes', descriptor.constructor) || [];
      const injectTokens = Reflect.getMetadata(INJECT_METADATA, descriptor.constructor) || [];

      for (let i = 0; i < paramTypes.length; i++) {
        const token = injectTokens[i] || paramTypes[i];
        if (token) {
          dependencies.push(this.resolve(token));
        }
      }
    }

    return dependencies;
  }

  private isDisposable(obj: any): obj is Disposable {
    return obj && typeof obj.dispose === 'function';
  }
}

// Global container instance
export const container = new DIContainer();
