type EventHandler<T = any> = (data: T) => void;

export class EventEmitter<Events extends Record<string, any>> {
  private handlers: Map<keyof Events, Set<EventHandler>> = new Map();

  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.add(handler);

    // 언구독 함수 반환
    return () => {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => handler(data));
    }
  }

  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }
}