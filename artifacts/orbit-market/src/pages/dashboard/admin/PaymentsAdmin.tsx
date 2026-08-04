/**
 * Admin financial console.
 *
 * Every panel is backed by an endpoint that already exists under
 * /api/payments/admin/* — no new API was added for this screen.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Receipt, RotateCcw, Banknote, Ticket, Percent, ShieldAlert,
  FileText, Search, TrendingUp, AlertCircle, Plus, X, Save,
} from 'lucide-react';
import { apiFetch } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import DashboardLayout from '../DashboardLayout';
import {
  Money, StatusBadge, LoadingRows, EmptyState, ErrorState, StatCard, Panel,
  Pagination, ExportButton, exportCsv, inputCls, labelCls, formatMoney,
} from '../../../components/payments/paymentsUi';

type Tab = 'overview' | 'transactions' | 'refunds' | 'settlements' | 'coupons' | 'audit';

interface Txn {
  id: number; orderId: number | null; vendorId: number | null; type: string; status: string;
  gateway: string; gatewayRef: string | null; amount: string; currency: string; createdAt: string;
}
interface RefundRow {
  id: number; orderId: number; amount: string; currency: string; reason: string | null;
  status: string; gateway: string | null; createdAt: string;
}
interface SettlementRow {
  id: number; vendorId: number; grossAmount: string; commissionAmount: string;
  netAmount: string; currency: string; status: string; payoutRef: string | null; createdAt: string;
}
interface CouponRow {
  id: number; code: string; type: string; value: string; minSubtotal: string | null;
  maxUses: number | null; usedCount: number; isActive: boolean;
}
interface AuditRow {
  id: number; action: string; severity: string; gateway: string | null;
  orderId: number | null; detail: Record<string, unknown> | null; createdAt: string;
}
interface Summary {
  grossVolume: number; refunded: number; commissionEarned: number;
  paidOut: number; heldInEscrow: number; payableToVendors: number;
}

const LIMIT = 25;

export default function PaymentsAdmin() {
  const { lang, dir } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);

  const [fGateway, setFGateway] = useState('');
  const [fType, setFType] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fOrder, setFOrder] = useState('');
  const [fSeverity, setFSeverity] = useState('');

  const [showCoupon, setShowCoupon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cForm, setCForm] = useState({ code: '', type: 'percent', value: '10', minSubtotal: '0', maxUses: '' });

  const tx = {
    en: {
      title: 'Payments', subtitle: 'Ledger, refunds, settlements and financial audit',
      overview: 'Overview', transactions: 'Transactions', refunds: 'Refunds',
      settlements: 'Settlements', coupons: 'Coupons', audit: 'Audit',
      grossVolume: 'Gross volume', refundedTotal: 'Refunded', commission: 'Commission earned',
      paidOut: 'Paid out', escrow: 'Held in escrow', payable: 'Payable to vendors',
      search: 'Order ID…', gateway: 'Gateway', type: 'Type', status: 'Status', severity: 'Severity',
      all: 'All', apply: 'Apply', reset: 'Reset', export: 'Export CSV',
      noTx: 'No transactions match these filters.', noRefunds: 'No refunds yet.',
      noSettlements: 'No settlements yet.', noCoupons: 'No coupons created yet.',
      noAudit: 'No audit entries.', of: 'entries',
      prev: 'Prev', next: 'Next', order: 'Order', vendor: 'Vendor', ref: 'Ref',
      markPaid: 'Mark paid', paying: 'Saving…', addCoupon: 'New coupon',
      code: 'Code', value: 'Value', minSubtotal: 'Min subtotal', maxUses: 'Max uses',
      used: 'used', save: 'Create', cancel: 'Cancel', percent: 'Percent', fixed: 'Fixed',
      loadFailed: 'Could not load this data.', retry: 'Try again',
      couponCreated: 'Coupon created.', settlementPaid: 'Settlement marked as paid.',
      active: 'Active', inactive: 'Inactive',
    },
    ar: {
      title: 'المدفوعات', subtitle: 'الدفتر المالي والاستردادات والتسويات والتدقيق',
      overview: 'نظرة عامة', transactions: 'المعاملات', refunds: 'الاستردادات',
      settlements: 'التسويات', coupons: 'الكوبونات', audit: 'التدقيق',
      grossVolume: 'إجمالي المبيعات', refundedTotal: 'المسترد', commission: 'العمولة المحققة',
      paidOut: 'المدفوع للبائعين', escrow: 'محتجز كضمان', payable: 'مستحق للبائعين',
      search: 'رقم الطلب…', gateway: 'البوابة', type: 'النوع', status: 'الحالة', severity: 'الخطورة',
      all: 'الكل', apply: 'تطبيق', reset: 'إعادة تعيين', export: 'تصدير CSV',
      noTx: 'لا توجد معاملات مطابقة.', noRefunds: 'لا توجد استردادات.',
      noSettlements: 'لا توجد تسويات.', noCoupons: 'لا توجد كوبونات.',
      noAudit: 'لا توجد سجلات تدقيق.', of: 'سجل',
      prev: 'السابق', next: 'التالي', order: 'طلب', vendor: 'بائع', ref: 'مرجع',
      markPaid: 'تعليم كمدفوع', paying: 'جارٍ الحفظ…', addCoupon: 'كوبون جديد',
      code: 'الرمز', value: 'القيمة', minSubtotal: 'أقل مجموع', maxUses: 'أقصى استخدام',
      used: 'مستخدم', save: 'إنشاء', cancel: 'إلغاء', percent: 'نسبة', fixed: 'مبلغ ثابت',
      loadFailed: 'تعذّر تحميل البيانات.', retry: 'إعادة المحاولة',
      couponCreated: 'تم إنشاء الكوبون.', settlementPaid: 'تم تعليم التسوية كمدفوعة.',
      active: 'نشط', inactive: 'غير نشط',
    },
  }[lang];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'overview') {
        setSummary(await apiFetch('/payments/admin/reports/summary'));
      } else if (tab === 'transactions') {
        const qs = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
        if (fGateway) qs.set('gateway', fGateway);
        if (fType) qs.set('type', fType);
        if (fStatus) qs.set('status', fStatus);
        if (fOrder) qs.set('orderId', fOrder);
        const d = await apiFetch(`/payments/admin/transactions?${qs.toString()}`);
        setTxns(d.transactions || []);
        setTxTotal(d.total || 0);
      } else if (tab === 'refunds') {
        setRefunds((await apiFetch('/payments/admin/refunds')).refunds || []);
      } else if (tab === 'settlements') {
        setSettlements((await apiFetch('/payments/admin/settlements')).settlements || []);
      } else if (tab === 'coupons') {
        setCoupons((await apiFetch('/payments/admin/coupons')).coupons || []);
      } else if (tab === 'audit') {
        const qs = fSeverity ? `?severity=${fSeverity}` : '';
        setAuditRows((await apiFetch(`/payments/admin/audit${qs}`)).entries || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tx.loadFailed);
    }
    setLoading(false);
  }, [tab, page, fGateway, fType, fStatus, fOrder, fSeverity, tx.loadFailed]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab]);

  async function paySettlement(id: number) {
    setSaving(true);
    try {
      await apiFetch(`/payments/admin/settlements/${id}/pay`, { method: 'POST', body: JSON.stringify({}) });
      setNotice(tx.settlementPaid);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx.loadFailed);
    }
    setSaving(false);
  }

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/payments/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: cForm.code,
          type: cForm.type,
          value: parseFloat(cForm.value),
          minSubtotal: parseFloat(cForm.minSubtotal || '0'),
          ...(cForm.maxUses ? { maxUses: parseInt(cForm.maxUses) } : {}),
        }),
      });
      setShowCoupon(false);
      setCForm({ code: '', type: 'percent', value: '10', minSubtotal: '0', maxUses: '' });
      setNotice(tx.couponCreated);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx.loadFailed);
    }
    setSaving(false);
  }

  const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: tx.overview, Icon: TrendingUp },
    { id: 'transactions', label: tx.transactions, Icon: Receipt },
    { id: 'refunds', label: tx.refunds, Icon: RotateCcw },
    { id: 'settlements', label: tx.settlements, Icon: Banknote },
    { id: 'coupons', label: tx.coupons, Icon: Ticket },
    { id: 'audit', label: tx.audit, Icon: ShieldAlert },
  ];

  const selectCls = `${inputCls} py-1.5`;

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={dir}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">{tx.title}</h2>
            <p className="text-white/40 text-sm">{tx.subtitle}</p>
          </div>
          {tab === 'coupons' && (
            <button onClick={() => setShowCoupon(true)}
              className="flex items-center gap-2 bg-primary text-[#0A1628] font-bold px-4 py-2 rounded-lg text-sm hover:bg-primary/90 transition-colors"
              data-testid="button-add-coupon">
              <Plus className="w-4 h-4" />{tx.addCoupon}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap border-b border-white/5 pb-px">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-t-lg transition-colors ${
                tab === id ? 'bg-primary/15 text-primary font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
              data-testid={`tab-${id}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {notice && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-4 py-2.5 flex items-center justify-between"
            data-testid="state-success">
            {notice}
            <button onClick={() => setNotice(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {loading ? <LoadingRows /> : error ? (
          <ErrorState Icon={AlertCircle} message={error} retryLabel={tx.retry} onRetry={() => void load()} />
        ) : (
          <>
            {/* ── Overview ── */}
            {tab === 'overview' && summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="panel-overview">
                <StatCard Icon={TrendingUp} label={tx.grossVolume} value={formatMoney(summary.grossVolume)} />
                <StatCard Icon={RotateCcw} label={tx.refundedTotal} value={formatMoney(summary.refunded)} />
                <StatCard Icon={Percent} label={tx.commission} value={formatMoney(summary.commissionEarned)} />
                <StatCard Icon={Banknote} label={tx.paidOut} value={formatMoney(summary.paidOut)} />
                <StatCard Icon={Wallet} label={tx.escrow} value={formatMoney(summary.heldInEscrow)} />
                <StatCard Icon={FileText} label={tx.payable} value={formatMoney(summary.payableToVendors)} />
              </div>
            )}

            {/* ── Transactions ── */}
            {tab === 'transactions' && (
              <div className="space-y-4" data-testid="panel-transactions">
                <Panel className="p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[140px]">
                      <label className={labelCls}>{tx.search}</label>
                      <div className="relative">
                        <Search className="w-4 h-4 text-white/25 absolute top-2.5 left-3 rtl:left-auto rtl:right-3" />
                        <input value={fOrder} onChange={e => setFOrder(e.target.value)}
                          className={`${inputCls} pl-9 rtl:pl-3 rtl:pr-9`} placeholder={tx.search}
                          data-testid="input-search-order" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{tx.gateway}</label>
                      <select value={fGateway} onChange={e => setFGateway(e.target.value)} className={selectCls} data-testid="filter-gateway">
                        <option value="">{tx.all}</option>
                        <option value="stripe">Stripe</option>
                        <option value="paymob">Paymob</option>
                        <option value="myfatoorah">MyFatoorah</option>
                        <option value="cod">COD</option>
                        <option value="manual">Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{tx.type}</label>
                      <select value={fType} onChange={e => setFType(e.target.value)} className={selectCls} data-testid="filter-type">
                        <option value="">{tx.all}</option>
                        <option value="charge">charge</option>
                        <option value="refund">refund</option>
                        <option value="commission">commission</option>
                        <option value="payout">payout</option>
                        <option value="adjustment">adjustment</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{tx.status}</label>
                      <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={selectCls} data-testid="filter-status">
                        <option value="">{tx.all}</option>
                        <option value="succeeded">succeeded</option>
                        <option value="pending">pending</option>
                        <option value="failed">failed</option>
                      </select>
                    </div>
                    <button onClick={() => { setFGateway(''); setFType(''); setFStatus(''); setFOrder(''); setPage(1); }}
                      className="text-sm px-3 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
                      data-testid="button-reset-filters">{tx.reset}</button>
                    <ExportButton label={tx.export} disabled={txns.length === 0}
                      onClick={() => exportCsv('transactions.csv', txns as unknown as Record<string, unknown>[])} />
                  </div>
                </Panel>

                {txns.length === 0 ? <EmptyState Icon={Receipt} message={tx.noTx} /> : (
                  <>
                    <div className="space-y-2">
                      {txns.map(t => (
                        <Panel key={t.id} className="p-4">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <StatusBadge status={t.type} />
                              <StatusBadge status={t.status} />
                              <span className="text-white/40 text-xs truncate">
                                {t.gateway}{t.gatewayRef ? ` · ${t.gatewayRef}` : ''}
                              </span>
                            </div>
                            <span className="text-white/40 text-xs">
                              {t.orderId ? `${tx.order} #${t.orderId}` : ''}{t.vendorId ? ` · ${tx.vendor} #${t.vendorId}` : ''}
                            </span>
                            <Money amount={t.amount} currency={t.currency} />
                            <span className="text-white/25 text-xs">{new Date(t.createdAt).toLocaleDateString()}</span>
                          </div>
                        </Panel>
                      ))}
                    </div>
                    <Pagination page={page} limit={LIMIT} total={txTotal} onPage={setPage}
                      labels={{ prev: tx.prev, next: tx.next, of: tx.of }} />
                  </>
                )}
              </div>
            )}

            {/* ── Refunds ── */}
            {tab === 'refunds' && (
              <div className="space-y-2" data-testid="panel-refunds">
                {refunds.length === 0 ? <EmptyState Icon={RotateCcw} message={tx.noRefunds} /> : (
                  <>
                    <div className="flex justify-end">
                      <ExportButton label={tx.export}
                        onClick={() => exportCsv('refunds.csv', refunds as unknown as Record<string, unknown>[])} />
                    </div>
                    {refunds.map(r => (
                      <Panel key={r.id} className="p-4">
                        <div className="flex items-center gap-4 flex-wrap">
                          <StatusBadge status={r.status} />
                          <span className="text-white/60 text-sm flex-1 min-w-0 truncate">
                            {tx.order} #{r.orderId}{r.reason ? ` — ${r.reason}` : ''}
                          </span>
                          <Money amount={`-${r.amount}`} currency={r.currency} />
                          <span className="text-white/25 text-xs">{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                      </Panel>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Settlements ── */}
            {tab === 'settlements' && (
              <div className="space-y-2" data-testid="panel-settlements">
                {settlements.length === 0 ? <EmptyState Icon={Banknote} message={tx.noSettlements} /> : (
                  <>
                    <div className="flex justify-end">
                      <ExportButton label={tx.export}
                        onClick={() => exportCsv('settlements.csv', settlements as unknown as Record<string, unknown>[])} />
                    </div>
                    {settlements.map(s => (
                      <Panel key={s.id} className="p-4">
                        <div className="flex items-center gap-4 flex-wrap">
                          <StatusBadge status={s.status} />
                          <span className="text-white/60 text-sm">{tx.vendor} #{s.vendorId}</span>
                          <span className="text-white/30 text-xs">
                            {formatMoney(s.grossAmount, s.currency)} − {formatMoney(s.commissionAmount, s.currency)}
                          </span>
                          <div className="flex-1" />
                          <Money amount={s.netAmount} currency={s.currency} />
                          {s.status !== 'paid' && (
                            <button onClick={() => void paySettlement(s.id)} disabled={saving}
                              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-[#0A1628] font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                              data-testid={`button-pay-settlement-${s.id}`}>
                              {saving ? tx.paying : tx.markPaid}
                            </button>
                          )}
                          {s.payoutRef && <span className="text-white/25 text-xs">{tx.ref}: {s.payoutRef}</span>}
                        </div>
                      </Panel>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Coupons ── */}
            {tab === 'coupons' && (
              <div className="space-y-2" data-testid="panel-coupons">
                {coupons.length === 0 ? <EmptyState Icon={Ticket} message={tx.noCoupons} /> : coupons.map(c => (
                  <Panel key={c.id} className="p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-primary font-bold text-sm tracking-wider">{c.code}</span>
                      <StatusBadge status={c.isActive ? 'succeeded' : 'cancelled'}
                        label={c.isActive ? tx.active : tx.inactive} />
                      <span className="text-white/60 text-sm">
                        {c.type === 'percent' ? `${parseFloat(c.value)}%` : formatMoney(c.value)}
                      </span>
                      <span className="text-white/30 text-xs">
                        {tx.minSubtotal}: {formatMoney(c.minSubtotal ?? 0)}
                      </span>
                      <div className="flex-1" />
                      <span className="text-white/40 text-xs">
                        {c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''} {tx.used}
                      </span>
                    </div>
                  </Panel>
                ))}
              </div>
            )}

            {/* ── Audit ── */}
            {tab === 'audit' && (
              <div className="space-y-4" data-testid="panel-audit">
                <Panel className="p-4">
                  <div className="flex items-end gap-3 flex-wrap">
                    <div>
                      <label className={labelCls}>{tx.severity}</label>
                      <select value={fSeverity} onChange={e => setFSeverity(e.target.value)} className={selectCls} data-testid="filter-severity">
                        <option value="">{tx.all}</option>
                        <option value="critical">critical</option>
                        <option value="warning">warning</option>
                        <option value="info">info</option>
                      </select>
                    </div>
                    <ExportButton label={tx.export} disabled={auditRows.length === 0}
                      onClick={() => exportCsv('payment-audit.csv', auditRows.map(a => ({
                        ...a, detail: JSON.stringify(a.detail),
                      })) as unknown as Record<string, unknown>[])} />
                  </div>
                </Panel>

                {auditRows.length === 0 ? <EmptyState Icon={ShieldAlert} message={tx.noAudit} /> : (
                  <div className="space-y-2">
                    {auditRows.map(a => (
                      <Panel key={a.id} className="p-4">
                        <div className="flex items-start gap-3 flex-wrap">
                          <StatusBadge status={a.severity} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{a.action}</p>
                            {a.detail && (
                              <p className="text-white/35 text-xs mt-0.5 break-all">{JSON.stringify(a.detail)}</p>
                            )}
                          </div>
                          <span className="text-white/25 text-xs whitespace-nowrap">
                            {new Date(a.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </Panel>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Coupon form */}
        {showCoupon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowCoupon(false)}>
            <form onClick={e => e.stopPropagation()} onSubmit={createCoupon}
              className="bg-[#112240] border border-white/10 rounded-xl p-6 w-full max-w-md space-y-4" dir={dir}>
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold">{tx.addCoupon}</h3>
                <button type="button" onClick={() => setShowCoupon(false)}><X className="w-4 h-4 text-white/40" /></button>
              </div>
              <div>
                <label className={labelCls}>{tx.code}</label>
                <input required value={cForm.code} onChange={e => setCForm({ ...cForm, code: e.target.value })}
                  className={inputCls} placeholder="SAVE10" data-testid="input-coupon-code" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{tx.type}</label>
                  <select value={cForm.type} onChange={e => setCForm({ ...cForm, type: e.target.value })}
                    className={inputCls} data-testid="select-coupon-type">
                    <option value="percent">{tx.percent}</option>
                    <option value="fixed">{tx.fixed}</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{tx.value}</label>
                  <input required type="number" step="0.01" min="0.01" value={cForm.value}
                    onChange={e => setCForm({ ...cForm, value: e.target.value })}
                    className={inputCls} data-testid="input-coupon-value" />
                </div>
                <div>
                  <label className={labelCls}>{tx.minSubtotal}</label>
                  <input type="number" step="0.01" min="0" value={cForm.minSubtotal}
                    onChange={e => setCForm({ ...cForm, minSubtotal: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{tx.maxUses}</label>
                  <input type="number" min="1" value={cForm.maxUses}
                    onChange={e => setCForm({ ...cForm, maxUses: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-[#0A1628] font-bold px-4 py-2 rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  data-testid="button-save-coupon">
                  <Save className="w-4 h-4" />{saving ? tx.paying : tx.save}
                </button>
                <button type="button" onClick={() => setShowCoupon(false)}
                  className="px-4 py-2 rounded-lg text-sm bg-white/5 text-white/70 hover:bg-white/10 transition-colors">
                  {tx.cancel}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
