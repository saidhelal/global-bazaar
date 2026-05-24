import { useCallback, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  CheckCircle, Clock, Upload, FileText, Shield, AlertCircle,
  Download, ChevronRight, RefreshCw, Eye, X, ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  useVerificationStatus, useSubmitDocument, useSubmitSignedContract,
  type DocType, type VendorDocument,
} from '../../hooks/useVendorVerification';
import { useUploadImage } from '../../hooks/useUploadImage';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

// ── Document catalogue ──────────────────────────────────────────────────────
const DOC_TYPES: {
  type: DocType;
  required: boolean;
  icon: string;
  en: string; ar: string;
  descEn: string; descAr: string;
  acceptedFor?: string;
}[] = [
  { type: 'commercial_registration', required: true, icon: '🏢', en: 'Commercial Registration', ar: 'السجل التجاري', descEn: 'Official commercial registration certificate from the relevant authority.', descAr: 'شهادة السجل التجاري الرسمية من الجهة المختصة.' },
  { type: 'business_license', required: true, icon: '📋', en: 'Business License', ar: 'الرخصة التجارية', descEn: 'Valid business operating license issued by local authorities.', descAr: 'رخصة تشغيل تجاري سارية صادرة عن الجهات المحلية.' },
  { type: 'tax_card', required: true, icon: '💳', en: 'Tax Card', ar: 'البطاقة الضريبية', descEn: 'Tax identification card issued by the tax authority.', descAr: 'بطاقة التعريف الضريبي الصادرة عن هيئة الضرائب.' },
  { type: 'vat_certificate', required: true, icon: '📄', en: 'VAT Registration Certificate', ar: 'شهادة تسجيل ضريبة القيمة المضافة', descEn: 'Certificate proving VAT registration with the tax authority.', descAr: 'شهادة تثبت التسجيل في ضريبة القيمة المضافة لدى هيئة الضرائب.' },
  { type: 'certificate_of_origin', required: false, icon: '🌍', en: 'Certificate of Origin', ar: 'شهادة المنشأ', descEn: 'Certificate verifying the country of origin of your products.', descAr: 'شهادة تثبت بلد المنشأ لمنتجاتك.' },
  { type: 'health_certificate', required: false, icon: '🏥', en: 'Health Certificate', ar: 'الشهادة الصحية', descEn: 'Required for food & beverage vendors. Health inspection certificate.', descAr: 'مطلوبة لبائعي الأغذية والمشروبات. شهادة التفتيش الصحي.', acceptedFor: 'Food & Beverage' },
];

const DOC_STATUS_CONFIG = {
  pending: { en: 'Under Review', ar: 'قيد المراجعة', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  approved: { en: 'Approved', ar: 'مقبول', classes: 'bg-green-500/10 text-green-400 border-green-500/20' },
  rejected: { en: 'Rejected', ar: 'مرفوض', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
  reupload_requested: { en: 'Re-upload Required', ar: 'مطلوب إعادة الرفع', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
};

const STEPS = [
  { en: 'Account Setup', ar: 'إنشاء الحساب' },
  { en: 'Upload Documents', ar: 'رفع الوثائق' },
  { en: 'Legal Review', ar: 'المراجعة القانونية' },
  { en: 'Sign Agreement', ar: 'توقيع الاتفاقية' },
  { en: 'Approved Seller', ar: 'بائع معتمد' },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    not_started: 1, pending_documents: 1, documents_submitted: 1,
    documents_under_review: 2, documents_approved: 2,
    contract_pending: 3, contract_submitted: 3,
    approved: 4, rejected: 4,
  };
  return map[status] ?? 1;
}

// ── Document upload card ────────────────────────────────────────────────────
function DocumentCard({
  doc: def,
  uploadedDoc,
  lang,
  dir,
  onUpload,
}: {
  doc: typeof DOC_TYPES[number];
  uploadedDoc?: VendorDocument;
  lang: string;
  dir: string;
  onUpload: (type: DocType, file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const canUpload = !uploadedDoc || uploadedDoc.status === 'rejected' || uploadedDoc.status === 'reupload_requested';
  const statusCfg = uploadedDoc ? DOC_STATUS_CONFIG[uploadedDoc.status] : null;

  return (
    <div className={`bg-[#112240] rounded-xl border p-4 flex flex-col gap-3 transition-all ${
      uploadedDoc?.status === 'approved'
        ? 'border-green-500/20'
        : uploadedDoc?.status === 'rejected' || uploadedDoc?.status === 'reupload_requested'
          ? 'border-orange-500/30'
          : 'border-white/[0.07]'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">{def.icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-semibold text-sm">
                {lang === 'ar' ? def.ar : def.en}
              </h3>
              {def.required ? (
                <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 px-1.5 py-0.5 rounded-full font-medium">
                  {lang === 'ar' ? 'مطلوب' : 'Required'}
                </span>
              ) : (
                <span className="text-[10px] bg-white/5 text-white/40 border border-white/10 px-1.5 py-0.5 rounded-full font-medium">
                  {lang === 'ar' ? 'اختياري' : 'Optional'}
                </span>
              )}
            </div>
            <p className="text-white/40 text-xs mt-0.5 leading-relaxed">
              {lang === 'ar' ? def.descAr : def.descEn}
            </p>
          </div>
        </div>

        {/* Status badge */}
        {statusCfg && (
          <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold flex-shrink-0 ${statusCfg.classes}`}>
            {lang === 'ar' ? statusCfg.ar : statusCfg.en}
          </span>
        )}
      </div>

      {/* Admin notes (for rejected/reupload) */}
      {uploadedDoc?.adminNotes && (uploadedDoc.status === 'rejected' || uploadedDoc.status === 'reupload_requested') && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-3 py-2">
          <p className="text-orange-400/80 text-xs">
            <strong className="text-orange-400">{lang === 'ar' ? 'ملاحظة المراجع: ' : 'Reviewer note: '}</strong>
            {uploadedDoc.adminNotes}
          </p>
        </div>
      )}

      {/* Uploaded file info */}
      {uploadedDoc && (
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
          <FileText className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
          <span className="text-white/60 text-xs truncate flex-1">
            {uploadedDoc.fileName || (lang === 'ar' ? 'ملف مرفوع' : 'Uploaded file')}
          </span>
          <a href={uploadedDoc.fileUrl} target="_blank" rel="noopener noreferrer"
            className="text-[#D4AF37]/70 hover:text-[#D4AF37] transition-colors flex-shrink-0">
            <Eye className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Upload button */}
      {canUpload && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              uploadedDoc?.status === 'reupload_requested' || uploadedDoc?.status === 'rejected'
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25'
                : 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20'
            }`}
          >
            {uploadedDoc ? <RefreshCw className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
            {uploadedDoc
              ? (lang === 'ar' ? 'إعادة رفع الملف' : 'Re-upload File')
              : (lang === 'ar' ? 'رفع الملف' : 'Upload File')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(def.type, file);
              e.target.value = '';
            }}
          />
        </>
      )}
    </div>
  );
}

// ── Progress stepper ────────────────────────────────────────────────────────
function ProgressStepper({ currentStep, lang }: { currentStep: number; lang: string }) {
  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
      {STEPS.map((step, idx) => {
        const done = idx < currentStep;
        const active = idx === currentStep;
        return (
          <div key={idx} className="flex items-center min-w-0" style={{ flex: idx < STEPS.length - 1 ? '1 1 0' : undefined }}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                done ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0A1628]'
                  : active ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                    : 'bg-white/5 border-white/15 text-white/30'
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : idx + 1}
              </div>
              <span className={`text-[10px] font-medium text-center whitespace-nowrap ${
                active ? 'text-[#D4AF37]' : done ? 'text-white/60' : 'text-white/25'
              }`}>
                {lang === 'ar' ? step.ar : step.en}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-5 rounded-full transition-all ${done ? 'bg-[#D4AF37]' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function VendorOnboarding() {
  const { lang, dir } = useLanguage();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useVerificationStatus();
  const submitDoc = useSubmitDocument();
  const submitContract = useSubmitSignedContract();
  const { uploadImage, isUploading, progress } = useUploadImage();
  const [uploadingType, setUploadingType] = useState<DocType | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const contractFileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const status = data?.vendor?.verificationStatus ?? 'not_started';
  const stepIndex = getStepIndex(status);
  const docMap: Record<DocType, VendorDocument> = {} as any;
  for (const d of data?.documents ?? []) docMap[d.type] = d;

  const handleDocUpload = useCallback(async (type: DocType, file: File) => {
    setUploadError(null);
    setUploadingType(type);
    try {
      const url = await uploadImage(file);
      await submitDoc.mutateAsync({ type, fileUrl: url, fileName: file.name });
    } catch (e: any) {
      setUploadError(e.message || 'Upload failed');
    } finally {
      setUploadingType(null);
    }
  }, [uploadImage, submitDoc]);

  const handleContractUpload = useCallback(async () => {
    if (!contractFile) return;
    setUploadError(null);
    try {
      const url = await uploadImage(contractFile);
      await submitContract.mutateAsync({ signedContractUrl: url, fileName: contractFile.name });
      setContractFile(null);
    } catch (e: any) {
      setUploadError(e.message || 'Upload failed');
    }
  }, [contractFile, uploadImage, submitContract]);

  const tx = {
    en: {
      title: 'Vendor Onboarding',
      subtitle: 'Complete these steps to become an approved seller on Orbit Market',
      docsTitle: 'Legal Documents',
      docsSubtitle: 'Upload all required documents to begin the verification process.',
      reviewTitle: 'Under Legal Review',
      reviewSubtitle: 'Our legal team is reviewing your documents. This typically takes 2-3 business days.',
      contractTitle: 'Sign the Vendor Agreement',
      contractSubtitle: 'Your documents have been approved! Download the agreement, sign it, and upload the signed copy.',
      contractReviewTitle: 'Agreement Under Review',
      contractReviewSubtitle: 'We have received your signed agreement and are processing final approval.',
      approvedTitle: 'Congratulations! You\'re an Approved Seller',
      approvedSubtitle: 'You can now publish products and start selling on Orbit Market.',
      rejectedTitle: 'Application Not Approved',
      rejectedSubtitle: 'Unfortunately your application was not approved at this time. Please contact our support team.',
      downloadContract: 'Download Contract Template',
      uploadSigned: 'Upload Signed Contract',
      goToDashboard: 'Go to Dashboard',
      contactSupport: 'Contact Support',
      uploading: 'Uploading…',
      uploadProgress: 'Upload progress',
      selectFile: 'Select signed contract file',
      submitSigned: 'Submit Signed Contract',
      requiredDocs: 'Required Documents (4)',
      optionalDocs: 'Optional Documents',
      allRequired: 'Upload all 4 required documents to proceed.',
    },
    ar: {
      title: 'تأهيل البائع',
      subtitle: 'أكمل هذه الخطوات لتصبح بائعاً معتمداً في أوربت ماركت',
      docsTitle: 'الوثائق القانونية',
      docsSubtitle: 'ارفع جميع الوثائق المطلوبة لبدء عملية التحقق.',
      reviewTitle: 'قيد المراجعة القانونية',
      reviewSubtitle: 'يقوم فريقنا القانوني بمراجعة وثائقك. يستغرق ذلك عادةً 2-3 أيام عمل.',
      contractTitle: 'توقيع اتفاقية البائع',
      contractSubtitle: 'تمت الموافقة على وثائقك! نزّل الاتفاقية ووقّعها وارفع النسخة الموقعة.',
      contractReviewTitle: 'الاتفاقية قيد المراجعة',
      contractReviewSubtitle: 'استلمنا اتفاقيتك الموقعة ونعالج الموافقة النهائية.',
      approvedTitle: 'تهانينا! أنت الآن بائع معتمد',
      approvedSubtitle: 'يمكنك الآن نشر المنتجات والبدء في البيع على أوربت ماركت.',
      rejectedTitle: 'لم تتم الموافقة على الطلب',
      rejectedSubtitle: 'للأسف لم تتم الموافقة على طلبك في الوقت الحالي. يرجى التواصل مع فريق الدعم.',
      downloadContract: 'تنزيل نموذج العقد',
      uploadSigned: 'رفع العقد الموقع',
      goToDashboard: 'الذهاب إلى لوحة التحكم',
      contactSupport: 'تواصل مع الدعم',
      uploading: 'جارٍ الرفع…',
      uploadProgress: 'تقدم الرفع',
      selectFile: 'اختر ملف العقد الموقع',
      submitSigned: 'إرسال العقد الموقع',
      requiredDocs: 'الوثائق المطلوبة (4)',
      optionalDocs: 'الوثائق الاختيارية',
      allRequired: 'ارفع جميع الوثائق الأربعة المطلوبة للمتابعة.',
    },
  }[lang];

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col" dir={dir}>
      <Header />
      <main id="main-content" className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 md:py-12">
        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          {lang === 'ar' ? 'العودة إلى لوحة التحكم' : 'Back to Dashboard'}
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">{tx.title}</h1>
          <p className="text-white/50 mt-1">{tx.subtitle}</p>
        </div>

        {/* Progress stepper */}
        <div className="bg-[#112240] border border-white/[0.07] rounded-2xl p-5 mb-8">
          <ProgressStepper currentStep={stepIndex} lang={lang} />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
          </div>
        ) : (
          <>
            {/* Upload error */}
            {uploadError && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{uploadError}</p>
                </div>
                <button onClick={() => setUploadError(null)} className="text-red-400/60 hover:text-red-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── STEP: UPLOAD DOCUMENTS ── */}
            {['not_started', 'pending_documents', 'documents_submitted'].includes(status) && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white">{tx.docsTitle}</h2>
                  <p className="text-white/50 text-sm mt-1">{tx.docsSubtitle}</p>
                </div>

                {/* Upload progress indicator */}
                {isUploading && uploadingType && (
                  <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#D4AF37] text-sm font-medium">{tx.uploading}</span>
                      <span className="text-[#D4AF37] text-sm">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-[#D4AF37]/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D4AF37] rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Required documents */}
                <div>
                  <h3 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
                    {tx.requiredDocs}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {DOC_TYPES.filter(d => d.required).map((def) => (
                      <DocumentCard
                        key={def.type}
                        doc={def}
                        uploadedDoc={docMap[def.type]}
                        lang={lang}
                        dir={dir}
                        onUpload={handleDocUpload}
                      />
                    ))}
                  </div>
                </div>

                {/* Optional documents */}
                <div>
                  <h3 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
                    {tx.optionalDocs}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {DOC_TYPES.filter(d => !d.required).map((def) => (
                      <DocumentCard
                        key={def.type}
                        doc={def}
                        uploadedDoc={docMap[def.type]}
                        lang={lang}
                        dir={dir}
                        onUpload={handleDocUpload}
                      />
                    ))}
                  </div>
                </div>

                {/* Status hint */}
                {status === 'documents_submitted' && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <p className="text-green-400 text-sm">
                      {lang === 'ar'
                        ? 'تم تقديم جميع الوثائق المطلوبة. يمكنك الإضافة أو التعديل حتى يبدأ الفريق القانوني المراجعة.'
                        : 'All required documents submitted. You may still add or update documents before legal review begins.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP: LEGAL REVIEW ── */}
            {['documents_under_review'].includes(status) && (
              <div className="space-y-6">
                <div className="bg-[#112240] border border-yellow-500/20 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{tx.reviewTitle}</h2>
                    <p className="text-white/50 mt-2 max-w-md">{tx.reviewSubtitle}</p>
                  </div>
                </div>

                {/* Show submitted docs with status */}
                <div>
                  <h3 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
                    {lang === 'ar' ? 'الوثائق المقدمة' : 'Submitted Documents'}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {DOC_TYPES.map((def) => (
                      docMap[def.type] && (
                        <DocumentCard
                          key={def.type}
                          doc={def}
                          uploadedDoc={docMap[def.type]}
                          lang={lang}
                          dir={dir}
                          onUpload={handleDocUpload}
                        />
                      )
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP: DOCUMENTS APPROVED (awaiting contract) ── */}
            {status === 'documents_approved' && (
              <div className="bg-[#112240] border border-green-500/20 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {lang === 'ar' ? 'تمت الموافقة على الوثائق' : 'Documents Approved'}
                  </h2>
                  <p className="text-white/50 mt-2 max-w-md">
                    {lang === 'ar'
                      ? 'تمت الموافقة على جميع وثائقك. سيتم إرسال اتفاقية البائع قريباً.'
                      : 'All your documents have been approved. Your vendor agreement will be sent shortly.'}
                  </p>
                </div>
              </div>
            )}

            {/* ── STEP: CONTRACT ── */}
            {['contract_pending'].includes(status) && data?.contract && (
              <div className="space-y-6">
                <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{tx.contractTitle}</h2>
                      <p className="text-white/50 text-sm mt-1">{tx.contractSubtitle}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {/* Download */}
                    {data.contract.contractUrl ? (
                      <a
                        href={data.contract.contractUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#D4AF37]/25 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        {tx.downloadContract}
                      </a>
                    ) : (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 text-blue-400 text-sm text-center">
                        {lang === 'ar'
                          ? 'سيتم إرسال نموذج العقد عبر البريد الإلكتروني قريباً.'
                          : 'The contract template will be emailed to you shortly.'}
                      </div>
                    )}

                    {/* Notes */}
                    {data.contract.adminNotes && (
                      <div className="bg-white/5 rounded-xl px-4 py-3">
                        <p className="text-white/50 text-xs">
                          <strong className="text-white/70">{lang === 'ar' ? 'ملاحظات: ' : 'Notes: '}</strong>
                          {data.contract.adminNotes}
                        </p>
                      </div>
                    )}

                    {/* Upload signed copy */}
                    <div className="border-t border-white/10 pt-4 space-y-3">
                      <p className="text-white/60 text-sm font-medium">
                        {lang === 'ar' ? 'بعد التوقيع، ارفع النسخة الموقعة هنا:' : 'After signing, upload the signed copy here:'}
                      </p>

                      <div
                        onClick={() => contractFileRef.current?.click()}
                        className="border-2 border-dashed border-white/10 hover:border-[#D4AF37]/30 rounded-xl p-5 text-center cursor-pointer transition-all"
                      >
                        {contractFile ? (
                          <div className="flex items-center justify-center gap-2 text-white/70">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">{contractFile.name}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setContractFile(null); }}
                              className="text-white/30 hover:text-white/60"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-white/30">
                            <Upload className="w-6 h-6" />
                            <span className="text-sm">{tx.selectFile}</span>
                            <span className="text-xs">PDF, JPG, PNG</span>
                          </div>
                        )}
                      </div>

                      <input
                        ref={contractFileRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setContractFile(f);
                          e.target.value = '';
                        }}
                      />

                      {isUploading && (
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#D4AF37] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                      )}

                      <button
                        onClick={handleContractUpload}
                        disabled={!contractFile || isUploading}
                        className="w-full py-3 bg-[#D4AF37] text-[#0A1628] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#c9a432] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-4 h-4" />
                        {isUploading ? tx.uploading : tx.submitSigned}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP: CONTRACT SUBMITTED (waiting for review) ── */}
            {status === 'contract_submitted' && (
              <div className="bg-[#112240] border border-yellow-500/20 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{tx.contractReviewTitle}</h2>
                  <p className="text-white/50 mt-2 max-w-md">{tx.contractReviewSubtitle}</p>
                </div>
              </div>
            )}

            {/* ── STEP: APPROVED ── */}
            {status === 'approved' && (
              <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#112240] border border-[#D4AF37]/30 rounded-2xl p-8 flex flex-col items-center text-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[#D4AF37]/15 border-2 border-[#D4AF37]/40 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-[#D4AF37]" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{tx.approvedTitle}</h2>
                  <p className="text-white/60 mt-2 max-w-md">{tx.approvedSubtitle}</p>
                </div>
                <Link
                  href="/dashboard"
                  className="bg-[#D4AF37] text-[#0A1628] font-bold px-8 py-3 rounded-xl text-sm hover:bg-[#c9a432] transition-all flex items-center gap-2"
                >
                  {tx.goToDashboard}
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              </div>
            )}

            {/* ── STEP: REJECTED ── */}
            {status === 'rejected' && (
              <div className="bg-[#112240] border border-red-500/20 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{tx.rejectedTitle}</h2>
                  <p className="text-white/50 mt-2 max-w-md">{tx.rejectedSubtitle}</p>
                </div>
                <a
                  href="mailto:support@orbitmarket.com"
                  className="bg-white/10 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-white/15 transition-all"
                >
                  {tx.contactSupport}
                </a>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
