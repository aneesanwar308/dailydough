import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';
import { connectToDatabase, getDb, isConnected } from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Initialize MongoDB connection on server boot
connectToDatabase().catch((err) => {
  console.warn('[Server] MongoDB Atlas initial connection warning (will retry on incoming requests):', err.message);
});

// Helper: Generate unique human-readable order number (e.g. ORD-202610-007)
async function generateOrderNumber(): Promise<string> {
  const db = await getDb();
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `ORD-${yearMonth}-`;

  if (!db) {
    const randomSeq = Math.floor(Math.random() * 900) + 100;
    return `${prefix}${randomSeq}`;
  }

  const lastOrder = await db.collection('orders')
    .find({ orderNumber: { $regex: `^${prefix}` } })
    .sort({ orderNumber: -1 })
    .limit(1)
    .toArray();

  let nextSeq = 1;
  if (lastOrder.length > 0 && lastOrder[0].orderNumber) {
    const parts = lastOrder[0].orderNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

// -----------------------------------------------------------------------------
// Health Check
// -----------------------------------------------------------------------------
app.get('/api/health', async (_req, res) => {
  try {
    const connected = isConnected();
    let stats: Record<string, number> = {};
    if (connected) {
      const db = await getDb();
      stats = {
        orders: await db.collection('orders').countDocuments(),
        prices: await db.collection('current_prices').countDocuments(),
        priceHistory: await db.collection('price_history').countDocuments(),
        auditLogs: await db.collection('audit_logs').countDocuments(),
      };
    }
    res.json({
      status: 'ok',
      mongodbConnected: connected,
      database: process.env.DB_NAME || 'dailydough',
      collections: stats,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// Prices
// -----------------------------------------------------------------------------
app.get('/api/prices', async (_req, res) => {
  try {
    const defaultPrices = [
      { packSizeKg: 5, pricePerBag: 650, updatedAt: new Date().toISOString() },
      { packSizeKg: 10, pricePerBag: 1280, updatedAt: new Date().toISOString() },
      { packSizeKg: 20, pricePerBag: 2500, updatedAt: new Date().toISOString() },
    ];

    const db = await getDb();
    if (!db) {
      return res.json(defaultPrices);
    }

    const prices = await db.collection('current_prices').find({}).toArray();

    if (prices.length === 0) {
      return res.json(defaultPrices);
    }

    const priceMap = new Map(prices.map((p) => [p.packSizeKg, p]));
    const complete = [5, 10, 20].map((size) => {
      const found = priceMap.get(size);
      if (found) {
        return {
          id: found._id.toString(),
          packSizeKg: found.packSizeKg,
          pricePerBag: Number(found.pricePerBag),
          effectiveAt: found.effectiveAt || found.updatedAt,
          updatedAt: found.updatedAt,
        };
      }
      const def = defaultPrices.find((d) => d.packSizeKg === size)!;
      return def;
    });

    res.json(complete);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/prices', async (req, res) => {
  try {
    const { packSizeKg, newPrice, effectiveAt } = req.body;
    const size = Number(packSizeKg);
    const price = Number(newPrice);

    if (![5, 10, 20].includes(size)) {
      return res.status(400).json({ error: 'Pack size must be 5, 10, or 20 kg.' });
    }
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number.' });
    }

    const db = await getDb();
    const currentDoc = await db.collection('current_prices').findOne({ packSizeKg: size });
    const previousPrice = currentDoc ? Number(currentDoc.pricePerBag) : null;

    const nowIso = new Date().toISOString();
    const effectiveIso = effectiveAt ? new Date(effectiveAt).toISOString() : nowIso;

    // 1. Update Current Price
    await db.collection('current_prices').updateOne(
      { packSizeKg: size },
      {
        $set: {
          packSizeKg: size,
          pricePerBag: price,
          effectiveAt: effectiveIso,
          updatedAt: nowIso,
        },
      },
      { upsert: true }
    );

    // 2. Insert into Price History
    const historyEntry = {
      packSizeKg: size,
      previousPrice,
      newPrice: price,
      effectiveAt: effectiveIso,
      createdAt: nowIso,
    };
    await db.collection('price_history').insertOne(historyEntry);

    // 3. Log Audit
    await db.collection('audit_logs').insertOne({
      actionType: 'PRICE_UPDATED',
      entityId: `pack_${size}kg`,
      details: {
        packSizeKg: size,
        previousPrice,
        newPrice: price,
        effectiveAt: effectiveIso,
      },
      timestamp: nowIso,
    });

    res.json({
      success: true,
      message: `Updated ${size}kg pack price to Rs. ${price}`,
      price: {
        packSizeKg: size,
        pricePerBag: price,
        effectiveAt: effectiveIso,
        updatedAt: nowIso,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/prices/history', async (_req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.json([]);
    }
    const history = await db.collection('price_history')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = history.map((h) => ({
      id: h._id.toString(),
      packSizeKg: h.packSizeKg,
      previousPrice: h.previousPrice != null ? Number(h.previousPrice) : null,
      newPrice: Number(h.newPrice),
      effectiveAt: h.effectiveAt,
      createdAt: h.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------
app.get('/api/orders', async (req, res) => {
  try {
    const { status, packSizeKg, search, startDate, endDate } = req.query;
    const filter: Record<string, any> = {};

    if (status && typeof status === 'string' && ['active', 'delivered', 'cancelled'].includes(status)) {
      filter.status = status;
    }

    if (packSizeKg) {
      filter.packSizeKg = Number(packSizeKg);
    }

    if (search && typeof search === 'string') {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { customerName: regex },
        { deliveryAddress: regex },
        { orderNumber: regex },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate && typeof startDate === 'string') {
        filter.createdAt.$gte = new Date(startDate).toISOString();
      }
      if (endDate && typeof endDate === 'string') {
        filter.createdAt.$lte = new Date(endDate).toISOString();
      }
    }

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: 'Database offline. MONGODB_URI not configured in .env.' });
    }
    const orders = await db.collection('orders')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    const mapped = orders.map((o) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      deliveryAddress: o.deliveryAddress,
      packSizeKg: o.packSizeKg,
      quantity: o.quantity,
      pricePerBag: Number(o.pricePerBag),
      totalAmount: Number(o.totalAmount),
      status: o.status,
      notes: o.notes || '',
      cancellationReason: o.cancellationReason || '',
      createdAt: o.createdAt,
      deliveredAt: o.deliveredAt || null,
      cancelledAt: o.cancelledAt || null,
      updatedAt: o.updatedAt,
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, deliveryAddress, packSizeKg, quantity, notes } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }
    if (!deliveryAddress || !deliveryAddress.trim()) {
      return res.status(400).json({ error: 'Delivery address is required.' });
    }

    const size = Number(packSizeKg);
    if (![5, 10, 20].includes(size)) {
      return res.status(400).json({ error: 'Pack size must be 5, 10, or 20 kg.' });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer.' });
    }

    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: 'Database offline. Please configure MONGODB_URI in .env.' });
    }

    // Atomic price lookup for snapshotting
    const priceDoc = await db.collection('current_prices').findOne({ packSizeKg: size });
    if (!priceDoc || !priceDoc.pricePerBag || Number(priceDoc.pricePerBag) <= 0) {
      return res.status(400).json({
        error: `No current price configured for ${size} kg pack. Please set a price in Price Management before creating orders.`,
      });
    }

    const pricePerBag = Number(priceDoc.pricePerBag);
    const totalAmount = pricePerBag * qty;
    const orderNumber = await generateOrderNumber();
    const nowIso = new Date().toISOString();

    const newOrder = {
      orderNumber,
      customerName: customerName.trim(),
      deliveryAddress: deliveryAddress.trim(),
      packSizeKg: size,
      quantity: qty,
      pricePerBag,
      totalAmount,
      status: 'active',
      notes: (notes || '').trim(),
      cancellationReason: null,
      createdAt: nowIso,
      deliveredAt: null,
      cancelledAt: null,
      updatedAt: nowIso,
    };

    const result = await db.collection('orders').insertOne(newOrder);

    // Audit Log
    await db.collection('audit_logs').insertOne({
      actionType: 'ORDER_CREATED',
      entityId: result.insertedId.toString(),
      details: {
        orderNumber,
        customerName: newOrder.customerName,
        packSizeKg: size,
        quantity: qty,
        pricePerBag,
        totalAmount,
      },
      timestamp: nowIso,
    });

    res.status(201).json({
      success: true,
      order: {
        id: result.insertedId.toString(),
        ...newOrder,
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Mark Order as Delivered
app.put('/api/orders/:id/deliver', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { orderNumber: id };

    const order = await db.collection('orders').findOne(query);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.status !== 'active') {
      return res.status(400).json({ error: `Cannot deliver order with status: ${order.status}` });
    }

    const nowIso = new Date().toISOString();
    await db.collection('orders').updateOne(query, {
      $set: {
        status: 'delivered',
        deliveredAt: nowIso,
        updatedAt: nowIso,
      },
    });

    await db.collection('audit_logs').insertOne({
      actionType: 'ORDER_DELIVERED',
      entityId: order.orderNumber,
      details: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        deliveredAt: nowIso,
      },
      timestamp: nowIso,
    });

    res.json({
      success: true,
      message: `Order ${order.orderNumber} marked as delivered.`,
      deliveredAt: nowIso,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Cancel Order
app.put('/api/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const db = await getDb();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { orderNumber: id };

    const order = await db.collection('orders').findOne(query);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.status !== 'active') {
      return res.status(400).json({ error: `Cannot cancel order with status: ${order.status}` });
    }

    const nowIso = new Date().toISOString();
    const reason = (cancellationReason || 'Cancelled by admin').trim();

    await db.collection('orders').updateOne(query, {
      $set: {
        status: 'cancelled',
        cancelledAt: nowIso,
        cancellationReason: reason,
        updatedAt: nowIso,
      },
    });

    await db.collection('audit_logs').insertOne({
      actionType: 'ORDER_CANCELLED',
      entityId: order.orderNumber,
      details: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        reason,
        cancelledAt: nowIso,
      },
      timestamp: nowIso,
    });

    res.json({
      success: true,
      message: `Order ${order.orderNumber} cancelled.`,
      cancelledAt: nowIso,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Edit Order
app.put('/api/orders/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, deliveryAddress, notes, packSizeKg, quantity } = req.body;
    const db = await getDb();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { orderNumber: id };

    const order = await db.collection('orders').findOne(query);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.status !== 'active') {
      return res.status(400).json({ error: 'Only active orders can be edited directly.' });
    }

    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = {
      customerName: (customerName || order.customerName).trim(),
      deliveryAddress: (deliveryAddress || order.deliveryAddress).trim(),
      notes: notes !== undefined ? notes.trim() : order.notes,
      updatedAt: nowIso,
    };

    // If pack size or quantity changed, recalculate using current price
    const newSize = packSizeKg ? Number(packSizeKg) : order.packSizeKg;
    const newQty = quantity ? parseInt(quantity, 10) : order.quantity;

    if (newSize !== order.packSizeKg || newQty !== order.quantity) {
      const priceDoc = await db.collection('current_prices').findOne({ packSizeKg: newSize });
      if (!priceDoc) {
        return res.status(400).json({ error: `No current price configured for ${newSize} kg pack.` });
      }
      const pricePerBag = Number(priceDoc.pricePerBag);
      updates.packSizeKg = newSize;
      updates.quantity = newQty;
      updates.pricePerBag = pricePerBag;
      updates.totalAmount = pricePerBag * newQty;
    }

    await db.collection('orders').updateOne(query, { $set: updates });

    await db.collection('audit_logs').insertOne({
      actionType: 'ORDER_EDITED',
      entityId: order.orderNumber,
      details: {
        orderNumber: order.orderNumber,
        oldValues: {
          customerName: order.customerName,
          packSizeKg: order.packSizeKg,
          quantity: order.quantity,
          totalAmount: order.totalAmount,
        },
        newValues: updates,
      },
      timestamp: nowIso,
    });

    res.json({ success: true, message: 'Order updated successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Admin Correction for Delivered Order
app.put('/api/orders/:id/correct', async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, deliveryAddress, notes, correctionReason } = req.body;
    const db = await getDb();
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { orderNumber: id };

    const order = await db.collection('orders').findOne(query);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = {
      updatedAt: nowIso,
    };
    if (customerName) updates.customerName = customerName.trim();
    if (deliveryAddress) updates.deliveryAddress = deliveryAddress.trim();
    if (notes !== undefined) updates.notes = notes.trim();

    await db.collection('orders').updateOne(query, { $set: updates });

    await db.collection('audit_logs').insertOne({
      actionType: 'ORDER_CORRECTED',
      entityId: order.orderNumber,
      details: {
        orderNumber: order.orderNumber,
        correctionReason: correctionReason || 'Administrative detail correction',
        oldValues: {
          customerName: order.customerName,
          deliveryAddress: order.deliveryAddress,
          notes: order.notes,
        },
        newValues: updates,
      },
      timestamp: nowIso,
    });

    res.json({ success: true, message: 'Delivered order corrected with audit trail' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// -----------------------------------------------------------------------------
// Audit Logs
// -----------------------------------------------------------------------------
app.get('/api/audit-logs', async (_req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.json([]);
    }
    const logs = await db.collection('audit_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    const formatted = logs.map((l) => ({
      id: l._id.toString(),
      actionType: l.actionType,
      entityId: l.entityId,
      details: l.details,
      timestamp: l.timestamp,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.listen(port, () => {
  console.log(`[Server] Daily Dough backend API listening on http://localhost:${port}`);
});
