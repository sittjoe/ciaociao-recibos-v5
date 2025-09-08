import { Injectable } from '../di/index.js';

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
}

@Injectable()
export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime?: Date;
  private nextRetryTime?: Date;
  private monitoringWindow: Array<{ success: boolean; timestamp: Date }> = [];

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - request rejected');
      }
    }

    this.totalRequests++;
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    this.nextRetryTime = undefined;
    this.monitoringWindow = [];
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(): void {
    this.state = 'open';
    this.lastFailureTime = new Date();
    this.nextRetryTime = new Date(Date.now() + this.config.resetTimeout);
  }

  /**
   * Force circuit breaker to closed state
   */
  forceClosed(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.nextRetryTime = undefined;
  }

  /**
   * Get failure rate within monitoring period
   */
  getFailureRate(): number {
    this.cleanupOldEntries();
    
    if (this.monitoringWindow.length === 0) {
      return 0;
    }
    
    const failures = this.monitoringWindow.filter(entry => !entry.success).length;
    return failures / this.monitoringWindow.length;
  }

  private onSuccess(): void {
    this.successCount++;
    this.addToMonitoringWindow(true);
    
    if (this.state === 'half-open') {
      // If we were half-open and got a success, close the circuit
      this.state = 'closed';
      this.failureCount = 0;
      this.nextRetryTime = undefined;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.addToMonitoringWindow(false);
    
    if (this.shouldOpenCircuit()) {
      this.state = 'open';
      this.nextRetryTime = new Date(Date.now() + this.config.resetTimeout);
    }
  }

  private shouldOpenCircuit(): boolean {
    // Open if we've exceeded the failure threshold
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }
    
    // Also check failure rate within monitoring period
    const failureRate = this.getFailureRate();
    return failureRate >= 0.5 && this.monitoringWindow.length >= 10;
  }

  private shouldAttemptReset(): boolean {
    return !!this.nextRetryTime && new Date() >= this.nextRetryTime;
  }

  private addToMonitoringWindow(success: boolean): void {
    this.monitoringWindow.push({
      success,
      timestamp: new Date(),
    });
    
    this.cleanupOldEntries();
  }

  private cleanupOldEntries(): void {
    const cutoff = new Date(Date.now() - this.config.monitoringPeriod);
    this.monitoringWindow = this.monitoringWindow.filter(
      entry => entry.timestamp > cutoff
    );
  }
}

/**
 * Circuit breaker factory for creating configured instances
 */
@Injectable()
export class CircuitBreakerFactory {
  private instances = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker instance
   */
  getInstance(
    name: string,
    config: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
    }
  ): CircuitBreaker {
    if (!this.instances.has(name)) {
      this.instances.set(name, new CircuitBreaker(config));
    }
    return this.instances.get(name)!;
  }

  /**
   * Remove circuit breaker instance
   */
  removeInstance(name: string): boolean {
    return this.instances.delete(name);
  }

  /**
   * Get all circuit breaker instances
   */
  getAllInstances(): Record<string, CircuitBreaker> {
    const result: Record<string, CircuitBreaker> = {};
    for (const [name, breaker] of this.instances.entries()) {
      result[name] = breaker;
    }
    return result;
  }

  /**
   * Get stats for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const result: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.instances.entries()) {
      result[name] = breaker.getStats();
    }
    return result;
  }
}
