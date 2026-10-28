import {
  Order,
  CurrentPrice,
  PriceHistory,
  AuditLog,
  PackSize,
} from '../types';
import {
  INITIAL_PRICES,
  INITIAL_PRICE_HISTORY,
  INITIAL_ORDERS,
  INITIAL_AUDIT_LOGS,
} from './seedData';

const LOCAL_STORAGE_KEYS = {
  ORDERS: 'dailydough_orders',
  PRICES: 'dailydough_prices',
  PRICE_HISTORY: 'dailydough_price_history',
  AUDIT_LOGS: 'dailydough_audit_logs',
};

// -----------------------------------------------------------------------------
// Local Storage Fallback Helpers
// -----------------------------------------------------------------------------
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('LocalStorage write error:', err);
  }
}

// Check if Express/MongoDB backend is reachable
let isBackendLive: boolean | null = null;

export async function checkBackendHealth(): Promise<{ live: boolean; details?: any }> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(id);
    if (res.ok) {
      const data = await res.json();
      isBackendLive = Boolean(data.mongodbConnected);
      return { live: isBackendLive, details: data };
    }
  } catch {
    // Backend offline / not running
  }
  isBackendLive = false;
  return { live: false };
}

export function getBackendStatus(): boolean {
  return !!isBackendLive;
}

// -----------------------------------------------------------------------------
// Orders API
// -----------------------------------------------------------------------------
export async function fetchOrders(): Promise<Order[]> {
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      isBackendLive = true;
      const data = await res.json();
      // Cache in local storage as well for offline resilience
      setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, data);
      return data;
    }
  } catch {
    isBackendLive = false;
  }

  // Fallback to local storage
  return getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
}

export async function createOrder(payload: {
  customerName: string;
  deliveryAddress: string;
  packSizeKg: PackSize;
  quantity: number;
  notes?: string;
}): Promise<Order> {
  // Validate
  if (!payload.customerName.trim()) throw new Error('Customer name is required.');
  if (!payload.deliveryAddress.trim()) throw new Error('Delivery address is required.');
  if (![5, 10, 20].includes(payload.packSizeKg)) throw new Error('Pack size must be 5, 10, or 20 kg.');
  if (payload.quantity <= 0) throw new Error('Quantity must be greater than zero.');

  // Try backend first if connected to MongoDB
  if (isBackendLive) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        return result.order;
      }
    } catch {
      isBackendLive = false;
    }
  }

  // Fallback to local storage mode
    const prices = await fetchPrices();
    const priceRecord = prices.find((p) => p.packSizeKg === payload.packSizeKg);
    if (!priceRecord || priceRecord.pricePerBag <= 0) {
      throw new Error(`No active price configured for ${payload.packSizeKg} kg pack.`);
    }

    const pricePerBag = priceRecord.pricePerBag;
    const totalAmount = pricePerBag * payload.quantity;
    const orders = getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, INITIAL_ORDERS);

    const now = new Date();
    const seq = orders.length + 1;
    const orderNumber = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(seq).padStart(3, '0')}`;
    const nowIso = now.toISOString();

    const newOrder: Order = {
      id: `ord-local-${Date.now()}`,
      orderNumber,
      customerName: payload.customerName.trim(),
      deliveryAddress: payload.deliveryAddress.trim(),
      packSizeKg: payload.packSizeKg,
      quantity: payload.quantity,
      pricePerBag,
      totalAmount,
      status: 'active',
      notes: payload.notes || '',
      cancellationReason: '',
      createdAt: nowIso,
      deliveredAt: null,
      cancelledAt: null,
      updatedAt: nowIso,
    };

    orders.unshift(newOrder);
    setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, orders);

    // Audit log
    await recordAuditLog({
      actionType: 'ORDER_CREATED',
      entityId: orderNumber,
      details: {
        orderNumber,
        customerName: newOrder.customerName,
        packSizeKg: newOrder.packSizeKg,
        quantity: newOrder.quantity,
        pricePerBag,
        totalAmount,
      },
    });

    return newOrder;
}

export async function markOrderAsDelivered(orderId: string): Promise<void> {
  try {
    const res = await fetch(`/api/orders/${orderId}/deliver`, { method: 'PUT' });
    if (res.ok) return;
  } catch {
    // Fallback to local storage
  }

  const orders = getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (idx === -1) throw new Error('Order not found.');

  const nowIso = new Date().toISOString();
  orders[idx] = {
    ...orders[idx],
    status: 'delivered',
    deliveredAt: nowIso,
    updatedAt: nowIso,
  };
  setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, orders);

  await recordAuditLog({
    actionType: 'ORDER_DELIVERED',
    entityId: orders[idx].orderNumber,
    details: { orderNumber: orders[idx].orderNumber, deliveredAt: nowIso },
  });
}

export async function cancelOrder(orderId: string, reason?: string): Promise<void> {
  try {
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancellationReason: reason }),
    });
    if (res.ok) return;
  } catch {
    // Fallback to local storage
  }

  const orders = getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (idx === -1) throw new Error('Order not found.');

  const nowIso = new Date().toISOString();
  const cancellationReason = reason?.trim() || 'Cancelled by admin';

  orders[idx] = {
    ...orders[idx],
    status: 'cancelled',
    cancelledAt: nowIso,
    cancellationReason,
    updatedAt: nowIso,
  };
  setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, orders);

  await recordAuditLog({
    actionType: 'ORDER_CANCELLED',
    entityId: orders[idx].orderNumber,
    details: { orderNumber: orders[idx].orderNumber, reason: cancellationReason },
  });
}

export async function editOrder(
  orderId: string,
  updates: {
    customerName: string;
    deliveryAddress: string;
    packSizeKg: PackSize;
    quantity: number;
    notes?: string;
  }
): Promise<void> {
  try {
    const res = await fetch(`/api/orders/${orderId}/edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) return;
  } catch {
    // Fallback to local storage
  }

  const orders = getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (idx === -1) throw new Error('Order not found.');

  const existing = orders[idx];
  let pricePerBag = existing.pricePerBag;
  let totalAmount = existing.totalAmount;

  // Recalculate if pack size or quantity changed
  if (updates.packSizeKg !== existing.packSizeKg || updates.quantity !== existing.quantity) {
    const prices = await fetchPrices();
    const p = prices.find((pr) => pr.packSizeKg === updates.packSizeKg);
    if (!p) throw new Error(`No current price for ${updates.packSizeKg} kg pack.`);
    pricePerBag = p.pricePerBag;
    totalAmount = pricePerBag * updates.quantity;
  }

  const nowIso = new Date().toISOString();
  orders[idx] = {
    ...existing,
    customerName: updates.customerName.trim(),
    deliveryAddress: updates.deliveryAddress.trim(),
    packSizeKg: updates.packSizeKg,
    quantity: updates.quantity,
    pricePerBag,
    totalAmount,
    notes: updates.notes || '',
    updatedAt: nowIso,
  };
  setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, orders);

  await recordAuditLog({
    actionType: 'ORDER_EDITED',
    entityId: existing.orderNumber,
    details: { orderNumber: existing.orderNumber, oldValues: existing, newValues: orders[idx] },
  });
}

export async function correctDeliveredOrder(
  orderId: string,
  payload: {
    customerName?: string;
    deliveryAddress?: string;
    notes?: string;
    correctionReason: string;
  }
): Promise<void> {
  try {
    const res = await fetch(`/api/orders/${orderId}/correct`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
  } catch {
    // Fallback to local storage
  }

  const orders = getLocalItem<Order[]>(LOCAL_STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
  if (idx === -1) throw new Error('Order not found.');

  const existing = orders[idx];
  const nowIso = new Date().toISOString();

  orders[idx] = {
    ...existing,
    customerName: payload.customerName ? payload.customerName.trim() : existing.customerName,
    deliveryAddress: payload.deliveryAddress ? payload.deliveryAddress.trim() : existing.deliveryAddress,
    notes: payload.notes !== undefined ? payload.notes.trim() : existing.notes,
    updatedAt: nowIso,
  };
  setLocalItem(LOCAL_STORAGE_KEYS.ORDERS, orders);

  await recordAuditLog({
    actionType: 'ORDER_CORRECTED',
    entityId: existing.orderNumber,
    details: {
      orderNumber: existing.orderNumber,
      correctionReason: payload.correctionReason,
      oldValues: existing,
      newValues: orders[idx],
    },
  });
}

// -----------------------------------------------------------------------------
// Prices API
// -----------------------------------------------------------------------------
export async function fetchPrices(): Promise<CurrentPrice[]> {
  try {
    const res = await fetch('/api/prices');
    if (res.ok) {
      const data = await res.json();
      setLocalItem(LOCAL_STORAGE_KEYS.PRICES, data);
      return data;
    }
  } catch {
    // Fallback to local storage
  }
  return getLocalItem<CurrentPrice[]>(LOCAL_STORAGE_KEYS.PRICES, INITIAL_PRICES);
}

export async function updatePackPrice(payload: {
  packSizeKg: PackSize;
  newPrice: number;
  effectiveAt?: string;
}): Promise<void> {
  if (payload.newPrice <= 0 || isNaN(payload.newPrice)) {
    throw new Error('Price must be a positive number.');
  }

  try {
    const res = await fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
  } catch {
    // Fallback to local storage
  }

  const prices = getLocalItem<CurrentPrice[]>(LOCAL_STORAGE_KEYS.PRICES, INITIAL_PRICES);
  const history = getLocalItem<PriceHistory[]>(LOCAL_STORAGE_KEYS.PRICE_HISTORY, INITIAL_PRICE_HISTORY);

  const idx = prices.findIndex((p) => p.packSizeKg === payload.packSizeKg);
  const previousPrice = idx !== -1 ? prices[idx].pricePerBag : null;
  const nowIso = new Date().toISOString();
  const effectiveIso = payload.effectiveAt || nowIso;

  if (idx !== -1) {
    prices[idx] = {
      ...prices[idx],
      pricePerBag: payload.newPrice,
      effectiveAt: effectiveIso,
      updatedAt: nowIso,
    };
  } else {
    prices.push({
      id: `price-${payload.packSizeKg}kg`,
      packSizeKg: payload.packSizeKg,
      pricePerBag: payload.newPrice,
      effectiveAt: effectiveIso,
      updatedAt: nowIso,
    });
  }

  // Insert history
  history.unshift({
    id: `hist-${Date.now()}`,
    packSizeKg: payload.packSizeKg,
    previousPrice,
    newPrice: payload.newPrice,
    effectiveAt: effectiveIso,
    createdAt: nowIso,
  });

  setLocalItem(LOCAL_STORAGE_KEYS.PRICES, prices);
  setLocalItem(LOCAL_STORAGE_KEYS.PRICE_HISTORY, history);

  await recordAuditLog({
    actionType: 'PRICE_UPDATED',
    entityId: `pack_${payload.packSizeKg}kg`,
    details: {
      packSizeKg: payload.packSizeKg,
      previousPrice,
      newPrice: payload.newPrice,
      effectiveAt: effectiveIso,
    },
  });
}

export async function fetchPriceHistory(): Promise<PriceHistory[]> {
  try {
    const res = await fetch('/api/prices/history');
    if (res.ok) {
      const data = await res.json();
      setLocalItem(LOCAL_STORAGE_KEYS.PRICE_HISTORY, data);
      return data;
    }
  } catch {
    // Fallback
  }
  return getLocalItem<PriceHistory[]>(LOCAL_STORAGE_KEYS.PRICE_HISTORY, INITIAL_PRICE_HISTORY);
}

// -----------------------------------------------------------------------------
// Audit Logs API
// -----------------------------------------------------------------------------
export async function fetchAuditLogs(): Promise<AuditLog[]> {
  try {
    const res = await fetch('/api/audit-logs');
    if (res.ok) {
      const data = await res.json();
      setLocalItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS, data);
      return data;
    }
  } catch {
    // Fallback
  }
  return getLocalItem<AuditLog[]>(LOCAL_STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
}

async function recordAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  const logs = getLocalItem<AuditLog[]>(LOCAL_STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
  const newLog: AuditLog = {
    id: `audit-${Date.now()}`,
    ...log,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog);
  setLocalItem(LOCAL_STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 100));
}
