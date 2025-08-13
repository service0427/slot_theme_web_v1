import { useState, useEffect, useRef } from 'react';
import { Store, StoreState } from '@/core/store/Store';

export function useStore<T extends StoreState>(store: Store<T>): T {
  const [state, setState] = useState<T>(store.getState());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const unsubscribe = store.subscribe((newState) => {
      if (isMountedRef.current) {
        setState(newState);
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [store]);

  return state;
}