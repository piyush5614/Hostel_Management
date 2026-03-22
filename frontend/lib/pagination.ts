/**
 * Pagination Utilities for Infinite Scroll
 * 
 * Provides cursor-based pagination helpers for stable infinite scroll
 * even when data is being updated in real-time.
 * 
 * Usage:
 * const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
 *   queryKey: ['students'],
 *   queryFn: ({ pageParam }) => fetchStudents({ cursor: pageParam }),
 *   getNextPageParam: (lastPage) => lastPage.nextCursor,
 * });
 */

/**
 * Encode cursor for API requests
 * Base64 encode cursor to safely pass via URL
 */
export function encodeCursor(data: any): string {
  try {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  } catch {
    return '';
  }
}

/**
 * Decode cursor from API response
 * Base64 decode cursor back to original data
 */
export function decodeCursor(encoded: string | undefined): any {
  if (!encoded) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Pagination state for a single list
 * Tracks current position in infinite scroll
 */
export interface PaginationState {
  cursor?: string; // Next cursor to fetch
  hasMore: boolean; // Are there more items?
  isLoading: boolean; // Currently fetching?
  error?: Error; // Last fetch error
  total?: number; // Total items available (if known)
}

/**
 * Paginated response from API
 * Standard format for all paginated endpoints
 */
export interface PaginatedResponse<T> {
  data: T[]; // Current page items
  cursor?: string; // Next cursor (null = no more items)
  total?: number; // Total count (optional)
  page?: number; // Page number (optional, for reference)
  totalPages?: number; // Total pages (optional, for reference)
}

/**
 * Create initial pagination state
 */
export function createInitialPaginationState(): PaginationState {
  return {
    cursor: undefined,
    hasMore: true,
    isLoading: false,
    error: undefined,
    total: undefined,
  };
}

/**
 * Calculate item offset from cursor
 * Used for progress indicators (e.g., "Showing 150 of 500")
 */
export function getItemOffset(pages: any[]): number {
  if (!pages) return 0;
  return pages.reduce((sum, page) => sum + (page.data?.length || 0), 0);
}

/**
 * Merge paginated responses intelligently
 * Removes duplicates when data changes during pagination
 */
export function mergePaginatedPages<T extends { id?: string | number }>(
  pages: PaginatedResponse<T>[],
  keyFn?: (item: T) => string | number
): T[] {
  const seenIds = new Set<string | number>();
  const merged: T[] = [];

  for (const page of pages) {
    for (const item of page.data || []) {
      const id = keyFn?.(item) ?? item.id;
      
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        merged.push(item);
      } else if (!id) {
        // No ID, add anyway (edge case)
        merged.push(item);
      }
    }
  }

  return merged;
}

/**
 * React Query configuration for infinite scroll
 * Returns options object ready to pass to useInfiniteQuery
 */
export function getInfiniteQueryConfig<T extends { id?: string | number }>(options: {
  queryKey: readonly unknown[];
  queryFn: (cursor?: string) => Promise<PaginatedResponse<T>>;
  deduplicationKey?: (item: T) => string | number;
}) {
  return {
    queryKey: options.queryKey,
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const response = await options.queryFn(pageParam);
      return response;
    },
    getNextPageParam: (lastPage: PaginatedResponse<T>) => {
      return lastPage.cursor || undefined; // undefined = no more pages
    },
    initialPageParam: undefined as string | undefined,
    // Merge pages, removing duplicates
    pages: (pages: PaginatedResponse<T>[]) => 
      mergePaginatedPages(pages, options.deduplicationKey),
  };
}

/**
 * Format item count for display
 * E.g., "Loaded 150 items..." or "Showing all 500 items"
 */
export function formatItemCount(loaded: number, total?: number): string {
  if (total === undefined) {
    return `Loaded ${loaded} item${loaded !== 1 ? 's' : ''}`;
  }
  
  if (loaded === total) {
    return `Showing all ${total} item${total !== 1 ? 's' : ''}`;
  }
  
  return `Showing ${loaded} of ${total} item${total !== 1 ? 's' : ''}`;
}

/**
 * Estimated time to load next page
 * Shows "Loading more..." or time estimate based on load speed
 */
export function getLoadingEstimate(
  itemsLoaded: number,
  timeElapsed: number,
  itemsPerPage: number = 50
): string {
  if (timeElapsed === 0 || itemsLoaded === 0) {
    return 'Loading...';
  }

  const itemsPerSecond = itemsLoaded / (timeElapsed / 1000);
  const timePerPage = itemsPerPage / itemsPerSecond;

  if (timePerPage < 1) {
    return 'Loading...';
  }
  if (timePerPage < 60) {
    return `Loading... (~${Math.round(timePerPage)}s)`;
  }

  return `Loading... (>1 min)`;
}

/**
 * Debug: Log pagination stats for troubleshooting
 */
export function logPaginationStats(
  pages: PaginatedResponse<any>[],
  queryKey: readonly unknown[]
) {
  const totalItems = getItemOffset(pages);
  const totalPages = pages.length;
  const itemsPerPage = pages[0]?.data?.length || 0;

  console.debug(
    `[Pagination] ${queryKey.join('/')} → ${totalItems} items across ${totalPages} pages (${itemsPerPage}/page)`
  );

  // Detect duplicates
  const ids = new Set<string | number>();
  let duplicates = 0;
  for (const page of pages) {
    for (const item of page.data || []) {
      if (item.id && ids.has(item.id)) {
        duplicates++;
      }
      ids.add(item.id);
    }
  }

  if (duplicates > 0) {
    console.warn(`[Pagination] Found ${duplicates} duplicate items!`);
  }
}
