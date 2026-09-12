'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

interface SidebarContextValue {
  /** Mobile: menu trượt vào / ra khỏi màn hình. */
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  /** Desktop: thu gọn menu còn dải icon. */
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
  isCollapsed: false,
  toggleCollapsed: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Đọc sau khi mount, không đọc lúc khởi tạo state: server render không có
  // localStorage nên nếu đọc ngay sẽ lệch với client và gây hydration mismatch.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setIsCollapsed(true);
    } catch {
      // Trình duyệt chặn storage thì cứ để mặc định mở rộng.
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed(c => {
      const next = !c;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* bỏ qua */ }
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{
      isOpen,
      toggle: () => setIsOpen(o => !o),
      close: () => setIsOpen(false),
      isCollapsed,
      toggleCollapsed,
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
