'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-xl p-5 transition-all duration-200 shadow-sm',
        onClick && 'cursor-pointer hover:border-border/80 hover:bg-card-hover/80 hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
};
