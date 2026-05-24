import { useState } from 'react';
import { Link, useParams } from 'wouter';
import {
  ArrowLeft, Shield, CheckCircle, XCircle, Clock, RefreshCw,
  FileText, Download, Eye, AlertCircle, Send, ChevronDown, ChevronUp,
  Store, Mail, Phone, Calendar, Tag
} from 'lucide-react';
import {
  useAdminVendorDetail, useReviewDocument, useGenerateContract,
  useApproveVendor, useRejectVendor,
  type VendorDocument, type DocType, type VerificationStatus,
} from '../../../hooks/useVendorVerification';
import { useLanguage } from '../../../contexts/LanguageContext';
import DashboardLayout from '../DashboardLayout';
import VerificationBadge from '../../../components/vendor/VerificationBadge';

// ── Document labels ─────────────────────────────────────────────────────────
const DOC_LABELS: Record<DocType, { en: string; ar: string; required: boolean }> = {
  commercial_registration: { en: 'Commercial Registration',          ar: 'السجل التجاري',                              required: true },
  business_license:        { en: 'Business License',                 ar: 'الرخصة التجارية',                            required: true },
  tax_card:                { en: 'Tax Card',                         ar: 'البطاقة الضريبية',                           required: true },
  vat_certificate:         { en: 'VAT Registration Certificate',     ar: 'شهادة تسجيل ضريبة القيمة المضافة',          required: true },
  certificate_of_origin:   { en: 'Certificate of Origin',            ar: 'شهادة المنشأ',                               required: false },
  health_certificate:      { en: 'Health Certificate',               ar: 'الشهادة الصحية',                             required: false },
};

const STATUS_CFG = {
  pending:           { en: 'Pending Review',      ar: 'قيد المراجعة',      classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  approved:          { en: 'Approved',             ar: 'مقبول',              classes: 'bg-green-500/10  text-green-400  border-green-500/20'  },
  rejected:          { en: 'Rejected',             ar: 'مرفوض',             classes: 'bg-red-500/10    text-red-400    border-red-500/20'    },
  reupload_requested:{ en: 'Re-upload Requested',  ar: 'مطلوب إعادة الرفع', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
};

// ── Single document review card ─────────────────────────────────────────────
function DocReviewCard({ doc, lang, onAction }: {
  doc: VendorDocument;
  lang: string;
  onAction: (docId: number, status: 'approved' | 'rejected' | 'reupload_requested', notes?: string) => void;
}) {
  const [expanded, setExpanded] = useState(doc.status !== 'approved');
  const [notes, setNotes] = useState(doc.adminNotes ?? '');
  const label = DOC_LABELS[doc.type];
  const sCfg = STATUS_CFG[doc.status];

  return (
    <div className={`bg-[#0A1628] rounded-xl border transition-all ${
      doc.status === 'approved' ? 'border-green-500/20' :
      doc.status === 'rejected' ? 'border-red-500/20' :
      doc.status === 'reupload_requested' ? 'border-orange-500/20' :
      'border-white/[0.07]'
    }`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {doc.status === 'approved' ? (
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : doc.status === 'rejected' ? (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          ) : doc.status === 'reupload_requested' ? (
            <RefreshCw className="w-5 h-5 text-orange-400 flex-shrink-0" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          )}
          <div>
            <p className="text-white font-medium text-sm">
              {lang === 'ar' ? label.ar : label.en}
              {label.required && (
                <span className="ml-1.5 text-[10px] text-[#D4AF37]/60 font-normal">
                  {lang === 'ar' ? '(مطلوب)' : '(required)'}
                </span>
              )}
            </p>
            <p className="text-white/30 text-xs mt-0.5">
              {new Date(doc.updatedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${sCfg.classes}`}>
            {lang === 'ar' ? sCfg.ar : sCfg.en}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* File link */}
          <div className="flex items-center gap-2">
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 hover:text-white transition-all"
            >
              <Eye className="w-4 h-4 text-[#D4AF37]" />
              {doc.fileName ?? (lang === 'ar' ? 'عرض الملف' : 'View File')}
              <Download className="w-3.5 h-3.5 text-white/30 ml-1" />
            </a>
          </div>

          {/* Notes input */}
          <div>
            <label className="text-white/40 text-xs mb-1.5 block">
              {lang === 'ar' ? 'ملاحظات للبائع (اختياري)' : 'Notes for vendor (optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={lang === 'ar' ? 'أضف ملاحظات...' : 'Add notes…'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 resize-none focus:outline-none focus:border-[#D4AF37]/30"
            />
          </div>

          {/* Action buttons */}
          {doc.status !== 'approved' && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onAction(doc.id, 'approved', notes || undefined)}
                className="flex items-center gap-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'قبول' : 'Approve'}
              </button>
              <button
                onClick={() => onAction(doc.id, 'reupload_requested', notes || undefined)}
                className="flex items-center gap-1.5 bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'طلب إعادة الرفع' : 'Request Re-upload'}
              </button>
              <button
                onClick={() => onAction(doc.id, 'rejected', notes || undefined)}
                className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/25 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'رفض' : 'Reject'}
              </button>
            </div>
          )}
          {doc.status === 'approved' && (
            <button
              onClick={() => onAction(doc.id, 'reupload_requested', notes || undefined)}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'إلغاء الموافقة / طلب إعادة رفع' : 'Revoke / Request Re-upload'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function LegalVendorDetail() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = parseInt(params.vendorId, 10);
  const { lang, dir } = useLanguage();

  const { data, isLoading, refetch } = useAdminVendorDetail(isNaN(vendorId) ? null : vendorId);
  const reviewDoc = useReviewDocument();
  const generateContract = useGenerateContract();
  const approveVendor = useApproveVendor();
  const rejectVendor = useRejectVendor();

  const [contractUrl, setContractUrl] = useState('');
  const [contractNotes, setContractNotes] = useState('');
  const [finalNotes, setFinalNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toast = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  };

  const handleDocAction = async (docId: number, status: 'approved' | 'rejected' | 'reupload_requested', notes?: string) => {
    try {
      await reviewDoc.mutateAsync({ docId, status, adminNotes: notes });
      toast('success', lang === 'ar' ? 'تم تحديث حالة الوثيقة' : 'Document status updated');
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const handleGenerateContract = async () => {
    try {
      await generateContract.mutateAsync({
        vendorId,
        contractUrl: contractUrl || undefined,
        adminNotes: contractNotes || undefined,
      });
      setContractUrl('');
      setContractNotes('');
      toast('success', lang === 'ar' ? 'تم إرسال الاتفاقية للبائع' : 'Contract sent to vendor');
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const handleApprove = async () => {
    try {
      await approveVendor.mutateAsync({ vendorId, adminNotes: finalNotes || undefined });
      toast('success', lang === 'ar' ? 'تمت الموافقة على البائع بنجاح' : 'Vendor approved successfully');
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      toast('error', lang === 'ar' ? 'يرجى ذكر سبب الرفض' : 'Please provide a rejection reason');
      return;
    }
    try {
      await rejectVendor.mutateAsync({ vendorId, adminNotes: rejectNotes });
      setShowRejectForm(false);
      setRejectNotes('');
      toast('success', lang === 'ar' ? 'تم رفض البائع' : 'Vendor rejected');
    } catch (e: any) {
      toast('error', e.message);
    }
  };

  const tx = {
    en: {
      back: 'Back to Legal Dashboard',
      vendorInfo: 'Vendor Information',
      documents: 'Legal Documents',
      contract: 'Vendor Agreement',
      finalDecision: 'Final Decision',
      generateContract: 'Send Agreement to Vendor',
      contractUrlLabel: 'Contract URL (Google Drive, Dropbox, etc.)',
      contractUrlPlaceholder: 'https://drive.google.com/…',
      contractNotesLabel: 'Notes for vendor',
      approveVendor: 'Approve as Seller',
      rejectVendor: 'Reject Application',
      rejectReason: 'Rejection reason (required)',
      confirmReject: 'Confirm Rejection',
      cancel: 'Cancel',
      noDocuments: 'No documents uploaded yet.',
      signedContract: 'Signed Contract Uploaded',
      viewSigned: 'View Signed Contract',
      contractPending: 'Awaiting Vendor Signature',
      contractApproved: 'Contract Approved',
      alreadyApproved: 'This vendor is already an approved seller.',
    },
    ar: {
      back: 'العودة إلى لوحة المراجعة القانونية',
      vendorInfo: 'معلومات البائع',
      documents: 'الوثائق القانونية',
      contract: 'اتفاقية البائع',
      finalDecision: 'القرار النهائي',
      generateContract: 'إرسال الاتفاقية للبائع',
      contractUrlLabel: 'رابط الاتفاقية (Google Drive، Dropbox، إلخ)',
      contractUrlPlaceholder: 'https://drive.google.com/…',
      contractNotesLabel: 'ملاحظات للبائع',
      approveVendor: 'الموافقة كبائع',
      rejectVendor: 'رفض الطلب',
      rejectReason: 'سبب الرفض (مطلوب)',
      confirmReject: 'تأكيد الرفض',
      cancel: 'إلغاء',
      noDocuments: 'لم يتم رفع أي وثائق بعد.',
      signedContract: 'تم رفع العقد الموقع',
      viewSigned: 'عرض العقد الموقع',
      contractPending: 'في انتظار توقيع البائع',
      contractApproved: 'تمت الموافقة على العقد',
      alreadyApproved: 'هذا البائع معتمد بالفعل.',
    },
  }[lang];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-24 text-white/40">
          {lang === 'ar' ? 'البائع غير موجود' : 'Vendor not found'}
        </div>
      </DashboardLayout>
    );
  }

  const { vendor, documents, contract } = data;
  const vStatus = vendor.verificationStatus as VerificationStatus;
  const canGenerateContract = ['documents_approved', 'contract_pending', 'contract_submitted'].includes(vStatus);
  const canFinalApprove = ['contract_submitted', 'contract_pending', 'documents_approved'].includes(vStatus) && !vendor.isVendorApproved;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl" dir={dir}>
        {/* Back */}
        <Link href="/dashboard/legal">
          <span className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {tx.back}
          </span>
        </Link>

        {/* Toast */}
        {actionMsg && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium ${
            actionMsg.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {actionMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {actionMsg.text}
          </div>
        )}

        {/* Vendor info card */}
        <div className="bg-[#112240] rounded-xl border border-white/[0.07] p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#0A1628] border border-white/10 flex items-center justify-center text-2xl font-bold text-[#D4AF37]">
                {vendor.fullName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">{vendor.storeName || vendor.fullName}</h2>
                <p className="text-white/50 text-sm">{vendor.fullName}</p>
              </div>
            </div>
            <VerificationBadge status={vStatus} size="md" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
            {[
              { Icon: Mail,     label: vendor.email },
              { Icon: Phone,    label: vendor.phone ?? '—' },
              { Icon: Store,    label: vendor.storeCategory ?? '—' },
              { Icon: Calendar, label: new Date(vendor.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
            ].map(({ Icon, label }, i) => (
              <div key={i} className="flex items-center gap-2 text-white/50">
                <Icon className="w-4 h-4 flex-shrink-0 text-white/30" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>

          {vendor.storeDescription && (
            <p className="text-white/40 text-sm mt-3 border-t border-white/5 pt-3">{vendor.storeDescription}</p>
          )}

          {vendor.isVendorApproved && (
            <div className="mt-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg px-3 py-2 text-[#D4AF37] text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 flex-shrink-0" />
              {tx.alreadyApproved}
            </div>
          )}
        </div>

        {/* ── Documents section ── */}
        <div className="bg-[#112240] rounded-xl border border-white/[0.07] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D4AF37]" />
              {tx.documents}
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {documents.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-6">{tx.noDocuments}</p>
            ) : (
              documents.map((doc) => (
                <DocReviewCard
                  key={doc.id}
                  doc={doc}
                  lang={lang}
                  onAction={handleDocAction}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Contract section ── */}
        {canGenerateContract && (
          <div className="bg-[#112240] rounded-xl border border-white/[0.07] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#D4AF37]" />
                {tx.contract}
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Signed contract (if submitted) */}
              {contract?.signedContractUrl && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-green-400 font-semibold text-sm">{tx.signedContract}</p>
                      {contract.signedAt && (
                        <p className="text-green-400/60 text-xs mt-0.5">
                          {new Date(contract.signedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <a
                    href={contract.signedContractUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-500/30 transition-all flex-shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {tx.viewSigned}
                  </a>
                </div>
              )}

              {/* Contract status */}
              {contract && !contract.signedContractUrl && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-yellow-400 text-sm">{tx.contractPending}</p>
                </div>
              )}

              {/* Generate / resend contract form */}
              <div className="space-y-3">
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">{tx.contractUrlLabel}</label>
                  <input
                    type="url"
                    value={contractUrl}
                    onChange={(e) => setContractUrl(e.target.value)}
                    placeholder={tx.contractUrlPlaceholder}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#D4AF37]/30"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1.5 block">{tx.contractNotesLabel}</label>
                  <textarea
                    value={contractNotes}
                    onChange={(e) => setContractNotes(e.target.value)}
                    rows={2}
                    placeholder={lang === 'ar' ? 'ملاحظات اختيارية...' : 'Optional notes…'}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 resize-none focus:outline-none focus:border-[#D4AF37]/30"
                  />
                </div>
                <button
                  onClick={handleGenerateContract}
                  disabled={generateContract.isPending}
                  className="w-full py-2.5 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#D4AF37]/25 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {generateContract.isPending
                    ? (lang === 'ar' ? 'جارٍ الإرسال...' : 'Sending…')
                    : tx.generateContract}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Final decision ── */}
        {!vendor.isVendorApproved && vStatus !== 'rejected' && (
          <div className="bg-[#112240] rounded-xl border border-white/[0.07] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-white font-semibold">{tx.finalDecision}</h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Approve */}
              <div className="space-y-2">
                <label className="text-white/50 text-xs block">
                  {lang === 'ar' ? 'ملاحظات (اختيارية)' : 'Notes (optional)'}
                </label>
                <textarea
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  rows={2}
                  placeholder={lang === 'ar' ? 'ملاحظات ختامية...' : 'Final notes…'}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 resize-none focus:outline-none focus:border-[#D4AF37]/30"
                />
                <button
                  onClick={handleApprove}
                  disabled={approveVendor.isPending}
                  className="w-full py-3 bg-green-500/15 text-green-400 border border-green-500/25 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-500/25 transition-all disabled:opacity-50"
                >
                  <Shield className="w-4 h-4" />
                  {approveVendor.isPending
                    ? (lang === 'ar' ? 'جارٍ الموافقة...' : 'Approving…')
                    : tx.approveVendor}
                </button>
              </div>

              <div className="border-t border-white/5 pt-3">
                {!showRejectForm ? (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="w-full py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    {tx.rejectVendor}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label className="text-red-400/70 text-xs block">{tx.rejectReason}</label>
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      rows={3}
                      placeholder={lang === 'ar' ? 'اكتب سبب الرفض...' : 'Write rejection reason…'}
                      className="w-full bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 resize-none focus:outline-none focus:border-red-500/40"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleReject}
                        disabled={rejectVendor.isPending || !rejectNotes.trim()}
                        className="flex-1 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-all disabled:opacity-50"
                      >
                        {rejectVendor.isPending ? (lang === 'ar' ? 'جارٍ الرفض...' : 'Rejecting…') : tx.confirmReject}
                      </button>
                      <button
                        onClick={() => { setShowRejectForm(false); setRejectNotes(''); }}
                        className="px-4 py-2.5 bg-white/5 text-white/50 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-all"
                      >
                        {tx.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Already rejected state */}
        {vStatus === 'rejected' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">
              {lang === 'ar' ? 'تم رفض هذا البائع.' : 'This vendor application has been rejected.'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
