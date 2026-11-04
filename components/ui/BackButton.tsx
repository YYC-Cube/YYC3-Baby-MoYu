import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface BackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  showIcon?: boolean;
  variant?: 'default' | 'minimal';
  className?: string;
}

export function BackButton({
  // 默认文案走 common.back 词条（zh 与原硬编码 "返回" 逐字一致）
  text,
  showIcon = false,
  variant = 'default',
  className,
  ...props
}: BackButtonProps) {
  const t = useTranslations('common');
  const label = text ?? t('back');
  return (
    <button
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200',
        variant === 'default'
          ? 'btn-back-no-arrow bg-white text-red-600 hover:bg-red-50'
          : 'bg-transparent text-gray-600 hover:text-gray-800',
        'colored-shadow-border',
        className
      )}
      {...props}
    >
      {showIcon && <ChevronLeft className="w-4 h-4" />}
      <span>{label}</span>
    </button>
  );
}
