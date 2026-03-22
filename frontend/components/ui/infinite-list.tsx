/**
 * Infinite Scroll List Component
 * 
 * Reusable component that handles:
 * - React Query infinite scroll with cursor-based pagination
 * - Intersection Observer for auto-load-more
 * - Loading skeleton animations
 * - Error handling & retry
 * - Empty state handling
 * 
 * Usage:
 * <InfiniteList
 *   queryKey={['students']}
 *   queryFn={(cursor) => fetchStudents({ cursor })}
 *   renderItem={(item) => <StudentCard student={item} />}
 *   renderSkeleton={() => <StudentCardSkeleton />}
 *   disabled={loading}
 * />
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { formatItemCount } from '../../lib/pagination';
import { PaginatedResponse } from '../../lib/pagination';

interface InfiniteListProps<T extends { id?: string | number }> {
  queryKey: readonly unknown[];
  queryFn: (cursor?: string) => Promise<PaginatedResponse<T>>;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderSkeleton?: () => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderError?: (error: Error, retry: () => void) => React.ReactNode;
  
  // Optional customization
  itemsPerPage?: number;
  containerClassName?: string;
  itemClassName?: string;
  skeletonCount?: number;
  disabled?: boolean;
  autoLoadMore?: boolean;
  onLoadMore?: () => void;
  
  // Deduplication key (defaults to item.id)
  deduplicationKey?: (item: T) => string | number;
}

/**
 * Renders a paginated list with infinite scroll
 * Auto-loads more items as user scrolls to bottom
 */
export function InfiniteList<T extends { id?: string | number }>({
  queryKey,
  queryFn,
  renderItem,
  renderSkeleton = () => <div className="h-16 bg-gray-200 rounded animate-pulse" />,
  renderEmpty = () => <div className="text-center text-gray-500 py-8">No items found</div>,
  renderError,
  itemsPerPage = 50,
  containerClassName = '',
  itemClassName = '',
  skeletonCount = 3,
  disabled = false,
  autoLoadMore = true,
  onLoadMore,
  deduplicationKey,
}: InfiniteListProps<T>) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      return await queryFn(pageParam);
    },
    getNextPageParam: (lastPage: PaginatedResponse<T>) => {
      return lastPage.cursor || undefined;
    },
    initialPageParam: undefined as string | undefined,
  });

  // Flatten all pages into single array with deduplication
  const items = React.useMemo(() => {
    if (!data?.pages) return [];

    const seenIds = new Set<string | number>();
    const merged: T[] = [];

    for (const page of data.pages) {
      for (const item of page.data || []) {
        const key = deduplicationKey?.(item) ?? item.id;

        if (key && !seenIds.has(key)) {
          seenIds.add(key);
          merged.push(item);
        } else if (!key) {
          merged.push(item);
        }
      }
    }

    return merged;
  }, [data?.pages, deduplicationKey]);

  // Set up Intersection Observer for auto-load-more
  useEffect(() => {
    if (!autoLoadMore || !observerTarget.current || disabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (hasNextPage && entry.isIntersecting && !isFetching) {
          fetchNextPage();
          onLoadMore?.();
        }
      },
      {
        rootMargin: '200px', // Load 200px before reaching bottom
        threshold: 0.01,
      }
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetching, fetchNextPage, autoLoadMore, disabled, onLoadMore]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className={containerClassName}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={`skeleton-${i}`} className={itemClassName}>
            {renderSkeleton()}
          </div>
        ))}
      </div>
    );
  }

  // Handle error state
  if (error && renderError) {
    return renderError(error as Error, () => refetch());
  }

  // Handle empty state
  if (items.length === 0) {
    return renderEmpty?.() ?? null;
  }

  return (
    <div className={containerClassName}>
      {/* Render all items */}
      {items.map((item, index) => (
        <div key={item.id ?? `item-${index}`} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      ))}

      {/* Loading indicator while fetching more */}
      {isFetching && (
        <div className={itemClassName}>
          {renderSkeleton()}
        </div>
      )}

      {/* Intersection observer target for auto-load */}
      <div ref={observerTarget} className="h-1" aria-label="Load more trigger" />

      {/* Footer text */}
      {!hasNextPage && items.length > 0 && (
        <div className="text-center text-sm text-gray-500 py-4">
          {formatItemCount(items.length)}
        </div>
      )}
    </div>
  );
}

/**
 * Hook for manual infinite scroll management
 * Use when you need more control than InfiniteList component
 */
export function useInfiniteList<T extends { id?: string | number }>(
  queryKey: readonly unknown[],
  queryFn: (cursor?: string) => Promise<PaginatedResponse<T>>,
  deduplicationKey?: (item: T) => string | number
) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      return await queryFn(pageParam);
    },
    getNextPageParam: (lastPage: PaginatedResponse<T>) => {
      return lastPage.cursor || undefined;
    },
    initialPageParam: undefined as string | undefined,
  });

  const items = React.useMemo(() => {
    if (!data?.pages) return [];

    const seenIds = new Set<string | number>();
    const merged: T[] = [];

    for (const page of data.pages) {
      for (const item of page.data || []) {
        const key = deduplicationKey?.(item) ?? item.id;

        if (key && !seenIds.has(key)) {
          seenIds.add(key);
          merged.push(item);
        } else if (!key) {
          merged.push(item);
        }
      }
    }

    return merged;
  }, [data?.pages, deduplicationKey]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetching, fetchNextPage]);

  return {
    items,
    hasNextPage,
    isFetching,
    isLoading,
    error,
    loadMore,
    refetch,
    itemCount: items.length,
  };
}
