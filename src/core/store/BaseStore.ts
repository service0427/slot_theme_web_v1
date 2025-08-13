export abstract class BaseStore<T> {
  protected state: T;
  private subscribers: ((state: T) => void)[] = [];

  constructor(initialState: T) {
    this.state = initialState;
  }

  protected setState(newState: Partial<T>): void {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  getState(): T {
    return this.state;
  }

  subscribe(callback: (state: T) => void): () => void {
    this.subscribers.push(callback);
    
    // 구독 해제 함수 반환
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notify(): void {
    this.subscribers.forEach(callback => callback(this.state));
  }
}