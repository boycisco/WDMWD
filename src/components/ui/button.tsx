import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer';

    const variants = {
      primary: 'bg-gradient-to-r from-[#0052FF] to-[#3888FF] text-white shadow-[0_0_18px_rgba(0,82,255,0.45)] hover:brightness-110 border border-[#3888FF]/40',
      secondary: 'bg-[#121B32] text-[#F0F4FF] hover:bg-[#1A2645] border border-[#1E2945] hover:border-[#2A3B66] shadow-sm',
      ghost: 'bg-transparent text-[#94A3C8] hover:text-[#F0F4FF] hover:bg-[#121B32]',
      danger: 'bg-[#F87171]/15 text-[#F87171] hover:bg-[#F87171]/25 border border-[#F87171]/30 shadow-[0_0_10px_rgba(248,113,113,0.2)]',
      outline: 'bg-transparent text-[#F0F4FF] border border-[#1E2945] hover:bg-[#121B32] hover:border-[#2A3B66]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
      md: 'h-10 px-4 text-sm rounded-xl gap-2',
      lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
      icon: 'h-9 w-9 rounded-lg text-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={twMerge(clsx(base, variants[variant], sizes[size], className))}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
