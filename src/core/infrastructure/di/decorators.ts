import 'reflect-metadata';
import { INJECTABLE_METADATA, INJECT_METADATA, ServiceLifecycle, Constructor } from './types.js';

/**
 * Decorator to mark a class as injectable
 * @param lifecycle Service lifecycle (singleton, transient, scoped)
 */
export function Injectable(lifecycle: ServiceLifecycle = 'transient') {
  return function <T extends Constructor>(target: T) {
    Reflect.defineMetadata(INJECTABLE_METADATA, { lifecycle }, target);
    return target;
  };
}

/**
 * Decorator to inject dependencies into constructor parameters
 * @param token The service token to inject
 */
export function Inject(token: string | symbol | Constructor<any>) {
  return function (target: any, _propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata(INJECT_METADATA, target) || [];
    existingTokens[parameterIndex] = token;
    Reflect.defineMetadata(INJECT_METADATA, existingTokens, target);
  };
}

/**
 * Decorator to mark a service as scoped
 */
export function Scoped() {
  return Injectable('scoped');
}

/**
 * Decorator to mark a service as singleton
 */
export function Singleton() {
  return Injectable('singleton');
}

/**
 * Decorator to mark a service as transient
 */
export function Transient() {
  return Injectable('transient');
}
