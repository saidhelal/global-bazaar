import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../contexts/AuthContext';
import CustomerDashboard from './CustomerDashboard';
import VendorDashboard from './VendorDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) setLocation('/login');
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) return null;

  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'vendor') return <VendorDashboard />;
  return <CustomerDashboard />;
}
