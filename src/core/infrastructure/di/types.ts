export type ServiceLifecycle = 'singleton' | 'transient' | 'scoped';

export type Constructor<T = {}> = new (...args: any[]) => T;

export interface ServiceDescriptor<T = any> {
  token: string | symbol | Constructor<T>;
  factory?: (...args: any[]) => T;
  constructor?: Constructor<T>;
  instance?: T;
  lifecycle: ServiceLifecycle;
  dependencies?: (string | symbol | Constructor<any>)[];
}

export interface ServiceScope {
  id: string;
  instances: Map<string | symbol | Constructor<any>, any>;
  dispose(): Promise<void>;
}

export interface Disposable {
  dispose(): void | Promise<void>;
}

export const INJECTABLE_METADATA = Symbol('injectable');
export const INJECT_METADATA = Symbol('inject');
export const SCOPED_METADATA = Symbol('scoped');
