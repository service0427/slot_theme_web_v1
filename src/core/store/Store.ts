import { EventEmitter } from '../utils/EventEmitter';

export interface StoreState {
  [key: string]: any;
}

export type StoreListener<T> = (state: T) => void;
export type Unsubscribe = () => void;

export abstract class Store<T extends StoreState> {
  protected state: T;
  private eventEmitter = new EventEmitter<{
    stateChange: T;
    [key: string]: any;
  }>();

  constructor(initialState: T) {
    this.state = { ...initialState };
  }

  getState(): T {
    return { ...this.state };
  }

  subscribe(listener: StoreListener<T>): Unsubscribe {
    return this.eventEmitter.on('stateChange', listener);
  }

  protected setState(newState: Partial<T>): void {
    this.state = {
      ...this.state,
      ...newState
    };
    this.eventEmitter.emit('stateChange', this.state);
  }

  protected emit(event: string, data: any): void {
    this.eventEmitter.emit(event, data);
  }

  protected on(event: string, handler: (data: any) => void): Unsubscribe {
    return this.eventEmitter.on(event, handler);
  }
}