import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { lang } = useLanguage();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
    if (!isLoading && user && roles && !roles.includes(user.role)) {
      setLocation('/dashboard');
    }
  }, [user, isLoading, roles, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">{lang === 'en' ? 'Loading...' : 'جاري التحميل...'}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;

  return <>{children}</>;
}
