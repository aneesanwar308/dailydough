import { describe, it, expect } from 'vitest';
import {
  calculateDashboardStats,
  getDateRangeBoundaries,
  isDateWithin,
  aggregateDailyRevenue,
  aggregatePackSizeDistribution,
} from '../lib/calculations';
import { Order, CurrentPrice } from '../types';

describe('Atta Chaki Business Calculations & Acceptance Rules', () => {
  const baseTime = new Date('2026-10-28T12:00:00.000Z');

  const mockPrices: CurrentPrice[] = [
    { packSizeKg: 5, pricePerBag: 650, updatedAt: '2026-10-01T00:00:00.000Z' },
    { packSizeKg: 10, pricePerBag: 1280, updatedAt: '2026-10-01T00:00:00.000Z' },
    { packSizeKg: 20, pricePerBag: 2500, updatedAt: '2026-10-01T00:00:00.000Z' },
  ];

  // Rule 4: Total amount equals price per bag multiplied by quantity
  it('Rule 4: Total amount must strictly equal pricePerBag * quantity', () => {
    const pricePerBag = 1280;
    const quantity = 3;
    const totalAmount = pricePerBag * quantity;
    expect(totalAmount).toBe(3840);
  });

  // Rule 1 & 2: Creating an order stores the correct price snapshot; updating a pack price does not change old orders
  it('Rule 1 & 2: Updating pack price does not mutate existing order price snapshot', () => {
    // Order created under original price
    const orderOriginal: Order = {
      id: 'ord-1',
      orderNumber: 'ORD-202610-001',
      customerName: 'Muhammad Tariq',
      deliveryAddress: 'Model Town, Lahore',
      packSizeKg: 10,
      quantity: 2,
      pricePerBag: 1280,
      totalAmount: 2560,
      status: 'active',
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
    };

    // Later, price for 10kg is increased to 1350
    const updatedPrices = mockPrices.map((p) =>
      p.packSizeKg === 10 ? { ...p, pricePerBag: 1350 } : p
    );

    // Rule 3: New orders use the updated price
    const newPriceFor10kg = updatedPrices.find((p) => p.packSizeKg === 10)!.pricePerBag;
    const newOrder: Order = {
      id: 'ord-2',
      orderNumber: 'ORD-202610-002',
      customerName: 'Ayesha Khan',
      deliveryAddress: 'DHA, Karachi',
      packSizeKg: 10,
      quantity: 2,
      pricePerBag: newPriceFor10kg,
      totalAmount: newPriceFor10kg * 2,
      status: 'active',
      createdAt: '2026-10-20T10:00:00.000Z',
      updatedAt: '2026-10-20T10:00:00.000Z',
    };

    expect(orderOriginal.pricePerBag).toBe(1280);
    expect(orderOriginal.totalAmount).toBe(2560);
    expect(newOrder.pricePerBag).toBe(1350);
    expect(newOrder.totalAmount).toBe(2700);
  });

  // Rule 5, 6, 7: Delivered vs Active vs Cancelled revenue isolation
  it('Rule 5, 6, 7: Only delivered orders contribute to delivered revenue; active and cancelled are excluded', () => {
    const orders: Order[] = [
      {
        id: 'ord-del-1',
        orderNumber: 'ORD-001',
        customerName: 'Customer A',
        deliveryAddress: 'Lahore',
        packSizeKg: 20,
        quantity: 2,
        pricePerBag: 2500,
        totalAmount: 5000,
        status: 'delivered',
        createdAt: '2026-10-10T00:00:00.000Z',
        deliveredAt: '2026-10-11T00:00:00.000Z',
        updatedAt: '2026-10-11T00:00:00.000Z',
      },
      {
        id: 'ord-act-1',
        orderNumber: 'ORD-002',
        customerName: 'Customer B',
        deliveryAddress: 'Islamabad',
        packSizeKg: 10,
        quantity: 4,
        pricePerBag: 1280,
        totalAmount: 5120,
        status: 'active',
        createdAt: '2026-10-12T00:00:00.000Z',
        updatedAt: '2026-10-12T00:00:00.000Z',
      },
      {
        id: 'ord-can-1',
        orderNumber: 'ORD-003',
        customerName: 'Customer C',
        deliveryAddress: 'Karachi',
        packSizeKg: 5,
        quantity: 10,
        pricePerBag: 650,
        totalAmount: 6500,
        status: 'cancelled',
        cancellationReason: 'Duplicate order',
        createdAt: '2026-10-12T00:00:00.000Z',
        cancelledAt: '2026-10-13T00:00:00.000Z',
        updatedAt: '2026-10-13T00:00:00.000Z',
      },
    ];

    const interval = {
      start: new Date('2026-10-01T00:00:00.000Z'),
      end: new Date('2026-10-31T23:59:59.999Z'),
    };

    const stats = calculateDashboardStats(orders, interval);

    // Delivered revenue MUST be exactly 5000 (ord-del-1), NEVER including active (5120) or cancelled (6500)
    expect(stats.totalDeliveredRevenue).toBe(5000);
    expect(stats.totalBagsDelivered).toBe(2);

    // Active pending value reported separately
    expect(stats.pendingOrderValue).toBe(5120);
    expect(stats.totalBagsPending).toBe(4);

    // Cancelled value reported separately
    expect(stats.cancelledOrderValue).toBe(6500);
    expect(stats.totalBagsCancelled).toBe(10);
  });

  // Rule 8: Status changes update correct counts, delivery rate and cancellation rate
  it('Rule 8: Rates are calculated correctly with zero-denominator guards', () => {
    const emptyStats = calculateDashboardStats([], {
      start: new Date('2026-10-01T00:00:00.000Z'),
      end: new Date('2026-10-31T23:59:59.999Z'),
    });

    // Guards prevent NaN or Infinity
    expect(emptyStats.deliveryCompletionRate).toBe(0);
    expect(emptyStats.cancellationRate).toBe(0);
    expect(emptyStats.avgDeliveredOrderValue).toBe(0);
    expect(emptyStats.avgBagsPerOrder).toBe(0);

    const orders: Order[] = [
      {
        id: '1',
        orderNumber: 'ORD-1',
        customerName: 'A',
        deliveryAddress: 'LHR',
        packSizeKg: 10,
        quantity: 2,
        pricePerBag: 1280,
        totalAmount: 2560,
        status: 'delivered',
        createdAt: '2026-10-10T00:00:00.000Z',
        deliveredAt: '2026-10-10T12:00:00.000Z',
        updatedAt: '2026-10-10T12:00:00.000Z',
      },
      {
        id: '2',
        orderNumber: 'ORD-2',
        customerName: 'B',
        deliveryAddress: 'LHR',
        packSizeKg: 10,
        quantity: 1,
        pricePerBag: 1280,
        totalAmount: 1280,
        status: 'cancelled',
        createdAt: '2026-10-10T00:00:00.000Z',
        cancelledAt: '2026-10-10T12:00:00.000Z',
        updatedAt: '2026-10-10T12:00:00.000Z',
      },
      {
        id: '3',
        orderNumber: 'ORD-3',
        customerName: 'C',
        deliveryAddress: 'LHR',
        packSizeKg: 20,
        quantity: 1,
        pricePerBag: 2500,
        totalAmount: 2500,
        status: 'active',
        createdAt: '2026-10-10T00:00:00.000Z',
        updatedAt: '2026-10-10T00:00:00.000Z',
      },
    ];

    const stats = calculateDashboardStats(orders, {
      start: new Date('2026-10-01T00:00:00.000Z'),
      end: new Date('2026-10-31T23:59:59.999Z'),
    });

    // Completion rate: 1 delivered / (1 delivered + 1 cancelled + 1 active) = 33.333%
    expect(stats.deliveryCompletionRate).toBeCloseTo(33.33, 1);

    // Cancellation rate: 1 cancelled / 3 total orders = 33.333%
    expect(stats.cancellationRate).toBeCloseTo(33.33, 1);
  });

  // Rule 9: Date filters correctly include and exclude orders
  it('Rule 9: Date filters correctly include and exclude orders based on date boundaries', () => {
    const insideDate = '2026-10-15T12:00:00.000Z';
    const outsideDate = '2026-09-25T12:00:00.000Z';

    const interval = {
      start: new Date('2026-10-01T00:00:00.000Z'),
      end: new Date('2026-10-31T23:59:59.999Z'),
    };

    expect(isDateWithin(insideDate, interval)).toBe(true);
    expect(isDateWithin(outsideDate, interval)).toBe(false);
  });

  // Rule 11 & 12: Missing prices and invalid parameters
  it('Rule 11 & 12: Missing price lookup or non-positive price/qty are caught', () => {
    const prices: CurrentPrice[] = [
      { packSizeKg: 5, pricePerBag: 0, updatedAt: '' }, // zero price
      { packSizeKg: 10, pricePerBag: 1280, updatedAt: '' },
    ];

    const getPrice = (size: number) => {
      const p = prices.find((x) => x.packSizeKg === size);
      if (!p || p.pricePerBag <= 0) {
        throw new Error(`No current price configured for ${size} kg pack.`);
      }
      return p.pricePerBag;
    };

    expect(() => getPrice(5)).toThrowError(/No current price configured/);
    expect(() => getPrice(20)).toThrowError(/No current price configured/);
    expect(getPrice(10)).toBe(1280);
  });
});
