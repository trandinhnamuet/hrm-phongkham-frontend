import React from 'react';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-14 px-4 sm:px-6 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
      <div className="min-w-0">
        <h1 className="text-[15px] sm:text-base font-semibold text-gray-900 truncate">{title}</h1>
        {/* Mô tả chỉ là phụ, màn hình hẹp thì bỏ để nhường chỗ cho nút thao tác */}
        {description && <p className="hidden sm:block text-xs text-gray-500 truncate">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
        {/* Chuông nằm ngoài cùng bên phải. Chỉ desktop: trên mobile đã có sẵn
            chuông ở thanh trên cùng, thêm ở đây thành hai cái. */}
        <div className="hidden lg:block">
          <NotificationBell />
        </div>
      </div>
    </div>
  );
}
