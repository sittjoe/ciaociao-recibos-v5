export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isActive(): boolean;
}

export interface ITransactionalRepository {
  setUnitOfWork(unitOfWork: IUnitOfWork): void;
}

export abstract class UnitOfWork implements IUnitOfWork {
  protected isTransactionActive = false;
  protected repositories: ITransactionalRepository[] = [];

  abstract begin(): Promise<void>;
  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;

  isActive(): boolean {
    return this.isTransactionActive;
  }

  registerRepository(repository: ITransactionalRepository): void {
    this.repositories.push(repository);
    repository.setUnitOfWork(this);
  }

  protected setTransactionActive(active: boolean): void {
    this.isTransactionActive = active;
  }
}
