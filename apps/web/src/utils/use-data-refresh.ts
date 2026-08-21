import { useEffect, useReducer, useCallback } from 'react';
import { eventBus } from './event-bus';

/**
 * Hook that re-renders the component whenever one of the supplied
 * event names fires on the global event bus.
 *
 * Usage:
 *   const refreshKey = useDataRefresh(['leave-updated', 'student-updated']);
 *   // Use refreshKey as a dependency in useMemo / useEffect to recompute data.
 *
 * Passing '*' (or using EVENTS.DATA_CHANGED) listens to every event.
 */
export function useDataRefresh(events: string[]): number {
  const [key, bump] = useReducer((c: number) => c + 1, 0);

  useEffect(() => {
    const unsubs = events.map(evt => eventBus.on(evt, bump));
    return () => unsubs.forEach(u => u());
  }, [events.join(',')]);        // stable dep string

  return key;
}
