import React from 'react';
import { cn } from '../../lib/utils';

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-muted rounded w-3/4"></div>
      <div className="h-8 bg-muted rounded w-1/2"></div>
      <div className="h-4 bg-muted rounded w-full"></div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="animate-pulse">
        <div className="h-12 bg-muted border-b border-border"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-card border-b border-border flex items-center px-4 space-x-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/5"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3 rounded-lg bg-card border border-border">
          <div className="h-10 w-10 bg-muted rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
          <div className="h-4 bg-muted rounded w-20"></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-pulse">
      <div className="h-6 bg-muted rounded w-1/3 mb-6"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <div className="h-4 bg-muted rounded w-24"></div>
            <div className="flex-1 h-8 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ columns = 3 }: { columns?: number }) {
  return (
    <div className={cn('grid gap-6', {
      'grid-cols-1': columns === 1,
      'grid-cols-2': columns === 2,
      'grid-cols-3': columns === 3,
      'grid-cols-4': columns === 4,
    })}>
      {[...Array(columns)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonDetails() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 animate-pulse space-y-6">
      <div className="flex items-center space-x-4">
        <div className="h-16 w-16 bg-muted rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-5 bg-muted rounded w-2/3"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
