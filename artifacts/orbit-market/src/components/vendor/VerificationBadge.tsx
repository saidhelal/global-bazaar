import type { VerificationStatus } from '../../hooks/useVendorVerification';
import { useLanguage } from '../../contexts/LanguageContext';
import { Shield, Clock, CheckCircle, XCircle, FileText, AlertCircle } from 'lucide-react';

interface VerificationBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const CONFIG: Record<VerificationStatus, {
  en: string;
  ar: string;
  classes: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  not_started: {
    en: 'Not Verified',
    ar: 'غير موثق',
    classes: 'bg-white/5 text-white/40 border border-white/10',
    Icon: AlertCircle,
  },
  pending_documents: {
    en: 'Uploading Documents',
    ar: 'جارٍ رفع الوثائق',
    classes: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    Icon: FileText,
  },
  documents_submitted: {
    en: 'Documents Submitted',
    ar: 'تم تقديم الوثائق',
    classes: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    Icon: Clock,
  },
  documents_under_review: {
    en: 'Under Legal Review',
    ar: 'قيد المراجعة القانونية',
    classes: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    Icon: Clock,
  },
  documents_approved: {
    en: 'Documents Approved',
    ar: 'تمت الموافقة على الوثائق',
    classes: 'bg-green-500/10 text-green-400 border border-green-500/20',
    Icon: CheckCircle,
  },
  contract_pending: {
    en: 'Sign Agreement',
    ar: 'في انتظار التوقيع',
    classes: 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20',
    Icon: FileText,
  },
  contract_submitted: {
    en: 'Agreement Under Review',
    ar: 'الاتفاقية قيد المراجعة',
    classes: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    Icon: Clock,
  },
  approved: {
    en: 'Approved Seller',
    ar: 'بائع معتمد',
    classes: 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30',
    Icon: Shield,
  },
  rejected: {
    en: 'Application Rejected',
    ar: 'تم رفض الطلب',
    classes: 'bg-red-500/10 text-red-400 border border-red-500/20',
    Icon: XCircle,
  },
};

const SIZE_CLASSES = {
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

const ICON_SIZE = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export default function VerificationBadge({ status, size = 'md', showIcon = true }: VerificationBadgeProps) {
  const { lang } = useLanguage();
  const cfg = CONFIG[status] ?? CONFIG.not_started;
  const { Icon } = cfg;

  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${cfg.classes} ${SIZE_CLASSES[size]}`}>
      {showIcon && <Icon className={ICON_SIZE[size]} />}
      {lang === 'ar' ? cfg.ar : cfg.en}
    </span>
  );
}
