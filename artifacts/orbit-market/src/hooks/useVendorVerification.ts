import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../contexts/AuthContext';

export type DocType =
  | 'commercial_registration'
  | 'business_license'
  | 'tax_card'
  | 'vat_certificate'
  | 'certificate_of_origin'
  | 'health_certificate';

export type DocStatus = 'pending' | 'approved' | 'rejected' | 'reupload_requested';
export type ContractStatus = 'sent' | 'signed' | 'approved';

export type VerificationStatus =
  | 'not_started'
  | 'pending_documents'
  | 'documents_submitted'
  | 'documents_under_review'
  | 'documents_approved'
  | 'contract_pending'
  | 'contract_submitted'
  | 'approved'
  | 'rejected';

export interface VendorDocument {
  id: number;
  vendorId: number;
  type: DocType;
  fileUrl: string;
  fileName?: string | null;
  status: DocStatus;
  adminNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorContract {
  id: number;
  vendorId: number;
  contractUrl?: string | null;
  signedContractUrl?: string | null;
  status: ContractStatus;
  adminNotes?: string | null;
  generatedAt?: string | null;
  signedAt?: string | null;
  approvedAt?: string | null;
}

export interface VendorVerificationStatus {
  vendor: {
    id: number;
    fullName: string;
    email: string;
    storeName?: string | null;
    storeCategory?: string | null;
    verificationStatus: VerificationStatus;
    isVendorApproved: boolean;
  };
  documents: VendorDocument[];
  contract: VendorContract | null;
}

export interface AdminVendorSummary {
  id: number;
  email: string;
  fullName: string;
  storeName?: string | null;
  storeCategory?: string | null;
  verificationStatus: VerificationStatus;
  isVendorApproved: boolean;
  createdAt: string;
  docStats: { total: number; approved: number; pending: number; rejected: number };
}

export interface AdminVendorDetail {
  vendor: AdminVendorSummary & { phone?: string | null; storeDescription?: string | null };
  documents: VendorDocument[];
  contract: VendorContract | null;
}

// ── Vendor hooks ──────────────────────────────────────────────────────────

export function useVerificationStatus() {
  return useQuery<VendorVerificationStatus>({
    queryKey: ['vendor-verification-status'],
    queryFn: () => apiFetch('/vendor/verification/status'),
    staleTime: 30_000,
  });
}

export function useSubmitDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: DocType; fileUrl: string; fileName?: string }) =>
      apiFetch('/vendor/verification/documents', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-verification-status'] }),
  });
}

export function useSubmitSignedContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { signedContractUrl: string; fileName?: string }) =>
      apiFetch('/vendor/verification/contract/signed', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-verification-status'] }),
  });
}

// ── Admin/Legal hooks ──────────────────────────────────────────────────────

export function useAdminVendorList(status?: string) {
  return useQuery<{ vendors: AdminVendorSummary[] }>({
    queryKey: ['admin-vendor-list', status],
    queryFn: () => apiFetch(`/legal/vendors${status ? `?status=${status}` : ''}`),
    staleTime: 20_000,
  });
}

export function useAdminVendorDetail(vendorId: number | null) {
  return useQuery<AdminVendorDetail>({
    queryKey: ['admin-vendor-detail', vendorId],
    queryFn: () => apiFetch(`/legal/vendors/${vendorId}`),
    enabled: vendorId !== null,
    staleTime: 10_000,
  });
}

export function useReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, status, adminNotes }: { docId: number; status: DocStatus; adminNotes?: string }) =>
      apiFetch(`/legal/documents/${docId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNotes }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-vendor-detail'] });
      qc.invalidateQueries({ queryKey: ['admin-vendor-list'] });
    },
  });
}

export function useGenerateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, contractUrl, adminNotes }: { vendorId: number; contractUrl?: string; adminNotes?: string }) =>
      apiFetch(`/legal/vendors/${vendorId}/contract`, {
        method: 'POST',
        body: JSON.stringify({ contractUrl, adminNotes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vendor-detail'] });
      qc.invalidateQueries({ queryKey: ['admin-vendor-list'] });
    },
  });
}

export function useApproveVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, adminNotes }: { vendorId: number; adminNotes?: string }) =>
      apiFetch(`/legal/vendors/${vendorId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ adminNotes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vendor-detail'] });
      qc.invalidateQueries({ queryKey: ['admin-vendor-list'] });
    },
  });
}

export function useRejectVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, adminNotes }: { vendorId: number; adminNotes: string }) =>
      apiFetch(`/legal/vendors/${vendorId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ adminNotes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vendor-detail'] });
      qc.invalidateQueries({ queryKey: ['admin-vendor-list'] });
    },
  });
}
