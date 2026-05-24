import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from './AuthContext';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  fetchNotifications: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  deleteNotification: async () => {},
  clearAll: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch('/notifications?limit=50');
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter((n: AppNotification) => !n.isRead).length);
    } catch {}
    setLoading(false);
  }, [user]);

  const pollCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch('/notifications/count');
      const newCount = data.count ?? 0;
      if (newCount !== unreadCount) {
        setUnreadCount(newCount);
        // If count increased, refresh full list
        if (newCount > unreadCount) fetchNotifications();
      }
    } catch {}
  }, [user, unreadCount, fetchNotifications]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      pollRef.current = setInterval(pollCount, 30_000);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user]);

  const markRead = useCallback(async (id: number) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  const deleteNotification = useCallback(async (id: number) => {
    const wasUnread = notifications.find(n => n.id === id && !n.isRead);
    try {
      await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }, [notifications]);

  const clearAll = useCallback(async () => {
    try {
      await apiFetch('/notifications/clear-all', { method: 'DELETE' });
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, fetchNotifications, markRead, markAllRead, deleteNotification, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
