import { useState } from 'react';
import { Link } from 'wouter';
import { Shield, Clock, CheckCircle, XCircle, ChevronRight, Users, FileText, AlertCircle } from 'lucide-react';
import { useAdminVendorList, type VerificationStatus, type AdminVendorSummary } from '../../../hooks/useVendorVerification';
import { useLanguage } from '../../../contexts/LanguageContext';
import DashboardLayout from '../DashboardLayout';
import VerificationBadge from '../../../components/vendor/VerificationBadge';

const FILTERS: { value: string; en: string; ar: string }[] = [
  { value: '', en: 'All Vendors', ar: 'جميع البائعين' },
  { value: 'pending_documents', en: 'Uploading Docs', ar: 'جارٍ رفع الوثائق' },
  { value: 'documents_submitted', en: 'Docs Submitted', ar: 'تم تقديم الوثائق' },
  { value: 'documents_under_review', en: 'Under Review', ar: 'قيد المراجعة' },
  { value: 'documents_approved', en: 'Docs Approved', ar: 'وثائق مقبولة' },
  { value: 'contract_pending', en: 'Contract Sent', ar: 'تم إرسال العقد' },
  { value: 'contract_submitted', en: 'Contract Signed', ar: 'تم توقيع العقد' },
  { value: 'approved', en: 'Approved', ar: 'معتمد' },
  { value: 'rejected', en: 'Rejected', ar: 'مرفوض' },
];

function StatsCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-[#112240] rounded-xl border border-white/[0.07] p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-white/40 text-xs">{label}</p>
        <p className="text-white font-bold text-xl">{value}</p>
      </div>
    </div>
  );
}

function VendorRow({ vendor, lang }: { vendor: AdminVendorSummary; lang: string }) {
  const needsAction = ['documents_submitted', 'contract_submitted'].includes(vendor.verificationStatus ?? '');

  return (
    <Link href={`/dashboard/legal/${vendor.id}`}>
      <div className={`flex items-center gap-3 px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer border-b border-white/5 last:border-0 ${needsAction ? 'bg-[#D4AF37]/[0.03]' : ''}`}>
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-[#0A1628] border border-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-white/60 text-sm font-bold">
            {vendor.fullName?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-medium text-sm">{vendor.storeName || vendor.fullName}</p>
            {needsAction && (
              <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-1.5 py-0.5 rounded-full font-semibold">
                {lang === 'ar' ? 'يحتاج إجراء' : 'Action needed'}
              </span>
            )}
          </div>
          <p className="text-white/40 text-xs">{vendor.email}</p>
        </div>

        {/* Doc stats */}
        <div className="hidden md:flex items-center gap-3 text-xs flex-shrink-0">
          <span className="text-green-400">{vendor.docStats.approved} ✓</span>
          <span className="text-yellow-400">{vendor.docStats.pending} ⏳</span>
          {vendor.docStats.rejected > 0 && <span className="text-red-400">{vendor.docStats.rejected} ✗</span>}
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0">
          <VerificationBadge status={vendor.verificationStatus as VerificationStatus} size="sm" />
        </div>

        <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0 rtl:rotate-180" />
      </div>
    </Link>
  );
}

export default function LegalDashboard() {
  const { lang, dir } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('');
  const { data, isLoading } = useAdminVendorList(activeFilter || undefined);

  const vendors = data?.vendors ?? [];

  // Stats computed from all vendors (unfiltered) - re-query without filter for totals
  const { data: allData } = useAdminVendorList(undefined);
  const allVendors = allData?.vendors ?? [];

  const stats = {
    total: allVendors.length,
    needsReview: allVendors.filter(v => ['documents_submitted', 'contract_submitted'].includes(v.verificationStatus ?? '')).length,
    approved: allVendors.filter(v => v.verificationStatus === 'approved').length,
    rejected: allVendors.filter(v => v.verificationStatus === 'rejected').length,
  };

  const tx = {
    en: {
      title: 'Legal & Vendor Verification',
      subtitle: 'Review vendor documents and manage seller approvals',
      totalVendors: 'Total Vendors',
      needsReview: 'Needs Review',
      approved: 'Approved',
      rejected: 'Rejected',
      noVendors: 'No vendors match this filter',
    },
    ar: {
      title: 'المراجعة القانونية وتوثيق البائعين',
      subtitle: 'مراجعة وثائق البائعين وإدارة موافقات البائعين',
      totalVendors: 'إجمالي البائعين',
      needsReview: 'يحتاج مراجعة',
      approved: 'معتمد',
      rejected: 'مرفوض',
      noVendors: 'لا يوجد بائعون بهذا الفلتر',
    },
  }[lang];

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={dir}>
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#D4AF37]" />
            {tx.title}
          </h2>
          <p className="text-white/40 text-sm mt-1">{tx.subtitle}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={Users} label={tx.totalVendors} value={stats.total} color="bg-blue-500/10 text-blue-400" />
          <StatsCard icon={Clock} label={tx.needsReview} value={stats.needsReview} color="bg-[#D4AF37]/10 text-[#D4AF37]" />
          <StatsCard icon={CheckCircle} label={tx.approved} value={stats.approved} color="bg-green-500/10 text-green-400" />
          <StatsCard icon={XCircle} label={tx.rejected} value={stats.rejected} color="bg-red-500/10 text-red-400" />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                activeFilter === f.value
                  ? 'bg-[#D4AF37] text-[#0A1628]'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              {lang === 'ar' ? f.ar : f.en}
            </button>
          ))}
        </div>

        {/* Vendor table */}
        <div className="bg-[#112240] rounded-xl border border-white/[0.07] overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText className="w-8 h-8 text-white/15" />
              <p className="text-white/40 text-sm">{tx.noVendors}</p>
            </div>
          ) : (
            <div>
              {vendors.map((vendor) => (
                <VendorRow key={vendor.id} vendor={vendor} lang={lang} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
