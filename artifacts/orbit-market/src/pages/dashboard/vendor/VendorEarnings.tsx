/**
 * Vendor earnings, escrow balance and settlement history.
 * Backed by /api/payments/vendor/earnings and /api/payments/vendor/settlements.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Banknote, Lock, TrendingUp, Percent, Receipt, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { apiFetch } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import DashboardLayout from '../DashboardLayout';
import {
  Money, StatusBadge, LoadingRows, EmptyState, ErrorState, StatCard, Panel,
  ExportButton, exportCsv, formatMoney,
} from '../../../components/payments/paymentsUi';

interface SettlementItem {
  id: number; orderId: number; orderItemId: number; grossAmount: string;
  commissionRate: string; commissionAmount: string; netAmount: string;
  currency: string; status: string; createdAt: string;
}
interface Earnings {
  gross: number; commission: number; net: number;
  heldInEscrow: number; payable: number; paid: number;
  items: SettlementItem[];
}
interface SettlementBatch {
  id: number; grossAmount: string; commissionAmount: string; netAmount: string;
  currency: string; status: string; payoutRef: string | null; paidAt: string | null; createdAt: string;
}

type Tab = 'overview' | 'transactions' | 'settlements';

export default function VendorEarnings() {
  const { lang, dir } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tx = {
    en: {
      title: 'Earnings', subtitle: 'Your revenue, escrow balance and payouts',
      overview: 'Overview', transactions: 'Transactions', settlements: 'Settlements',
      gross: 'Gross sales', commission: 'Platform commission', net: 'Net earnings',
      escrow: 'Held in escrow', available: 'Available balance', paid: 'Paid out',
      escrowHint: 'Released when the order is delivered',
      availableHint: 'Awaiting the next payout',
      noItems: 'No earnings recorded yet.', noSettlements: 'No settlements yet.',
      order: 'Order', rate: 'rate', export: 'Export CSV',
      loadFailed: 'Could not load your earnings.', retry: 'Try again',
      payoutRef: 'Payout ref',
    },
    ar: {
      title: 'الأرباح', subtitle: 'إيراداتك ورصيد الضمان والمدفوعات',
      overview: 'نظرة عامة', transactions: 'المعاملات', settlements: 'التسويات',
      gross: 'إجمالي المبيعات', commission: 'عمولة المنصة', net: 'صافي الأرباح',
      escrow: 'محتجز كضمان', available: 'الرصيد المتاح', paid: 'المدفوع',
      escrowHint: 'يُفرج عنه عند تسليم الطلب',
      availableHint: 'بانتظار الدفعة القادمة',
      noItems: 'لا توجد أرباح مسجّلة بعد.', noSettlements: 'لا توجد تسويات بعد.',
      order: 'طلب', rate: 'النسبة', export: 'تصدير CSV',
      loadFailed: 'تعذّر تحميل الأرباح.', retry: 'إعادة المحاولة',
      payoutRef: 'مرجع الدفعة',
    },
  }[lang];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [e, s] = await Promise.all([
        apiFetch('/payments/vendor/earnings'),
        apiFetch('/payments/vendor/settlements'),
      ]);
      setEarnings(e);
      setBatches(s.settlements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : tx.loadFailed);
    }
    setLoading(false);
  }, [tx.loadFailed]);

  useEffect(() => { void load(); }, [load]);

  const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: tx.overview, Icon: TrendingUp },
    { id: 'transactions', label: tx.transactions, Icon: Receipt },
    { id: 'settlements', label: tx.settlements, Icon: Banknote },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={dir}>
        <div>
          <h2 className="text-xl font-bold text-white">{tx.title}</h2>
          <p className="text-white/40 text-sm">{tx.subtitle}</p>
        </div>

        <div className="flex gap-1 flex-wrap border-b border-white/5 pb-px">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-t-lg transition-colors ${
                tab === id ? 'bg-primary/15 text-primary font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
              data-testid={`tab-vendor-${id}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {loading ? <LoadingRows /> : error ? (
          <ErrorState Icon={AlertCircle} message={error} retryLabel={tx.retry} onRetry={() => void load()} />
        ) : !earnings ? (
          <EmptyState Icon={Wallet} message={tx.noItems} />
        ) : (
          <>
            {tab === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="panel-vendor-overview">
                <StatCard Icon={TrendingUp} label={tx.gross} value={formatMoney(earnings.gross)} />
                <StatCard Icon={Percent} label={tx.commission} value={formatMoney(earnings.commission)} />
                <StatCard Icon={Wallet} label={tx.net} value={formatMoney(earnings.net)} />
                <StatCard Icon={Lock} label={tx.escrow} value={formatMoney(earnings.heldInEscrow)} hint={tx.escrowHint} />
                <StatCard Icon={Banknote} label={tx.available} value={formatMoney(earnings.payable)} hint={tx.availableHint} />
                <StatCard Icon={CheckCircle2} label={tx.paid} value={formatMoney(earnings.paid)} />
              </div>
            )}

            {tab === 'transactions' && (
              <div className="space-y-2" data-testid="panel-vendor-transactions">
                {earnings.items.length === 0 ? <EmptyState Icon={Receipt} message={tx.noItems} /> : (
                  <>
                    <div className="flex justify-end">
                      <ExportButton label={tx.export}
                        onClick={() => exportCsv('vendor-earnings.csv', earnings.items as unknown as Record<string, unknown>[])} />
                    </div>
                    {earnings.items.map(i => (
                      <Panel key={i.id} className="p-4">
                        <div className="flex items-center gap-4 flex-wrap">
                          <StatusBadge status={i.status} />
                          <span className="text-white/60 text-sm">{tx.order} #{i.orderId}</span>
                          <span className="text-white/30 text-xs">
                            {formatMoney(i.grossAmount, i.currency)} − {formatMoney(i.commissionAmount, i.currency)}
                            {' '}({parseFloat(i.commissionRate)}% {tx.rate})
                          </span>
                          <div className="flex-1" />
                          <Money amount={i.netAmount} currency={i.currency} />
                          <span className="text-white/25 text-xs">{new Date(i.createdAt).toLocaleDateString()}</span>
                        </div>
                      </Panel>
                    ))}
                  </>
                )}
              </div>
            )}

            {tab === 'settlements' && (
              <div className="space-y-2" data-testid="panel-vendor-settlements">
                {batches.length === 0 ? <EmptyState Icon={Banknote} message={tx.noSettlements} /> : batches.map(b => (
                  <Panel key={b.id} className="p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <StatusBadge status={b.status} />
                      <span className="text-white/30 text-xs">
                        {formatMoney(b.grossAmount, b.currency)} − {formatMoney(b.commissionAmount, b.currency)}
                      </span>
                      <div className="flex-1" />
                      <Money amount={b.netAmount} currency={b.currency} />
                      {b.payoutRef && <span className="text-white/25 text-xs">{tx.payoutRef}: {b.payoutRef}</span>}
                      <span className="text-white/25 text-xs">
                        {new Date(b.paidAt ?? b.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
