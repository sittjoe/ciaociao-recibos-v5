export interface UseCase<TRequest = void, TResponse = void> {
  execute(request: TRequest): Promise<TResponse>;
}

export interface UseCaseWithValidation<TRequest = void, TResponse = void>
  extends UseCase<TRequest, TResponse> {
  validate(request: TRequest): Promise<string[]>;
}

export abstract class BaseUseCase<TRequest = void, TResponse = void>
  implements UseCaseWithValidation<TRequest, TResponse>
{
  abstract execute(request: TRequest): Promise<TResponse>;

  async validate(request: TRequest): Promise<string[]> {
    // Override in concrete implementations for validation
    return [];
  }

  protected async executeWithValidation(request: TRequest): Promise<TResponse> {
    const errors = await this.validate(request);
    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }
    return this.execute(request);
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
