/**
 * Customer payment history: status, retry, refund state and invoice download.
 * Uses /api/payments/my/history, /api/orders, /api/payments/:id/retry and
 * /api/payments/:id/invoice — all existing endpoints.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import {
  Receipt, RotateCcw, FileText, AlertCircle, RefreshCw, CreditCard, X,
} from 'lucide-react';
import { apiFetch } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import DashboardLayout from '../DashboardLayout';
import {
  Money, StatusBadge, LoadingRows, EmptyState, ErrorState, Panel, formatMoney,
} from '../../../components/payments/paymentsUi';

interface Txn {
  id: number; orderId: number | null; type: string; status: string;
  gateway: string; amount: string; currency: string; createdAt: string;
}
interface OrderRow {
  id: number; total: string; currency: string; status: string;
  paymentStatus: string; paymentGateway: string; createdAt: string;
}

export default function PaymentHistory() {
  const { lang, dir } = useLanguage();
  const [txns, setTxns] = useState<Txn[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const tx = {
    en: {
      title: 'Payments', subtitle: 'Your payment history, invoices and refunds',
      orders: 'Orders', history: 'Transaction history',
      noOrders: 'You have no orders yet.', noTx: 'No transactions yet.',
      order: 'Order', retry: 'Retry payment', invoice: 'Invoice',
      view: 'View order', working: 'Working…',
      retryOk: 'Payment reset — you can pay again from the order page.',
      invoiceOk: 'Invoice',
      loadFailed: 'Could not load your payments.', tryAgain: 'Try again',
      browse: 'Browse products',
    },
    ar: {
      title: 'المدفوعات', subtitle: 'سجل مدفوعاتك وفواتيرك واستردادك',
      orders: 'الطلبات', history: 'سجل المعاملات',
      noOrders: 'لا توجد طلبات بعد.', noTx: 'لا توجد معاملات بعد.',
      order: 'طلب', retry: 'إعادة محاولة الدفع', invoice: 'الفاتورة',
      view: 'عرض الطلب', working: 'جارٍ التنفيذ…',
      retryOk: 'تمت إعادة التعيين — يمكنك الدفع مجددًا من صفحة الطلب.',
      invoiceOk: 'الفاتورة',
      loadFailed: 'تعذّر تحميل المدفوعات.', tryAgain: 'إعادة المحاولة',
      browse: 'تصفّح المنتجات',
    },
  }[lang];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, o] = await Promise.all([
        apiFetch('/payments/my/history'),
        apiFetch('/orders'),
      ]);
      setTxns(h.transactions || []);
      setOrders(o.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : tx.loadFailed);
    }
    setLoading(false);
  }, [tx.loadFailed]);

  useEffect(() => { void load(); }, [load]);

  async function retryPayment(orderId: number) {
    setBusyId(orderId);
    setError(null);
    try {
      await apiFetch(`/payments/${orderId}/retry`, { method: 'POST', body: JSON.stringify({}) });
      setNotice(tx.retryOk);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : tx.loadFailed);
    }
    setBusyId(null);
  }

  async function downloadInvoice(orderId: number) {
    setBusyId(orderId);
    setError(null);
    try {
      const data = await apiFetch(`/payments/${orderId}/invoice`);
      const inv = data.invoice;
      // The API returns invoice data; render it as a plain-text document so the
      // customer gets a file without introducing a PDF dependency.
      const lines = [
        `${inv.number}`,
        `Order #${inv.orderId}`,
        `Issued: ${new Date(inv.issuedAt).toLocaleString()}`,
        '',
        `Subtotal:  ${formatMoney(inv.subtotal, inv.currency)}`,
        `Discount:  ${formatMoney(inv.discountAmount, inv.currency)}`,
        `Shipping:  ${formatMoney(inv.shippingAmount, inv.currency)}`,
        `Tax:       ${formatMoney(inv.taxAmount, inv.currency)}`,
        `Total:     ${formatMoney(inv.total, inv.currency)}`,
      ].join('\n');
      const url = URL.createObjectURL(new Blob([lines], { type: 'text/plain;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.number}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice(`${tx.invoiceOk} ${inv.number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : tx.loadFailed);
    }
    setBusyId(null);
  }

  const canRetry = (o: OrderRow) =>
    o.paymentStatus !== 'paid' && o.status !== 'cancelled' && o.status !== 'refunded';
  const canInvoice = (o: OrderRow) =>
    ['paid', 'refunded', 'partially_refunded'].includes(o.paymentStatus);

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={dir}>
        <div>
          <h2 className="text-xl font-bold text-white">{tx.title}</h2>
          <p className="text-white/40 text-sm">{tx.subtitle}</p>
        </div>

        {notice && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-4 py-2.5 flex items-center justify-between"
            data-testid="state-success">
            {notice}
            <button onClick={() => setNotice(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {loading ? <LoadingRows /> : error ? (
          <ErrorState Icon={AlertCircle} message={error} retryLabel={tx.tryAgain} onRetry={() => void load()} />
        ) : (
          <>
            {/* Orders with payment actions */}
            <div className="space-y-3" data-testid="panel-customer-orders">
              <h3 className="text-white font-semibold text-sm">{tx.orders}</h3>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/40 text-sm mb-4">{tx.noOrders}</p>
                  <Link href="/products"
                    className="inline-block text-sm px-4 py-2 rounded-lg bg-primary text-[#0A1628] font-bold hover:bg-primary/90 transition-colors">
                    {tx.browse}
                  </Link>
                </div>
              ) : orders.map(o => (
                <Panel key={o.id} className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold">{tx.order} #{o.id}</p>
                      <p className="text-white/30 text-xs">
                        {o.paymentGateway} · {new Date(o.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={o.paymentStatus} />
                    <div className="flex-1" />
                    <Money amount={o.total} currency={o.currency} />
                    <div className="flex items-center gap-2">
                      {canRetry(o) && (
                        <button onClick={() => void retryPayment(o.id)} disabled={busyId === o.id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-[#0A1628] font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          data-testid={`button-retry-${o.id}`}>
                          <RefreshCw className="w-3.5 h-3.5" />
                          {busyId === o.id ? tx.working : tx.retry}
                        </button>
                      )}
                      {canInvoice(o) && (
                        <button onClick={() => void downloadInvoice(o.id)} disabled={busyId === o.id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-50 transition-colors"
                          data-testid={`button-invoice-${o.id}`}>
                          <FileText className="w-3.5 h-3.5" />{tx.invoice}
                        </button>
                      )}
                      <Link href={`/orders/${o.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors">
                        {tx.view}
                      </Link>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>

            {/* Ledger view for the customer */}
            <div className="space-y-3" data-testid="panel-customer-history">
              <h3 className="text-white font-semibold text-sm">{tx.history}</h3>
              {txns.length === 0 ? <EmptyState Icon={RotateCcw} message={tx.noTx} /> : txns.map(t => (
                <Panel key={t.id} className="p-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <StatusBadge status={t.type} />
                    <StatusBadge status={t.status} />
                    <span className="text-white/60 text-sm">
                      {t.orderId ? `${tx.order} #${t.orderId}` : ''}
                    </span>
                    <span className="text-white/30 text-xs">{t.gateway}</span>
                    <div className="flex-1" />
                    <Money amount={t.amount} currency={t.currency} />
                    <span className="text-white/25 text-xs">{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </Panel>
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
