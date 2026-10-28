import { connectToDatabase, closeDatabase } from './db.js';

async function seed() {
  console.log('[Seed] Starting database seeding for Daily Dough Atta Chaki...');
    const conn = await connectToDatabase();
    if (!conn) {
      console.error('\n[Seed Error] Could not connect to MongoDB Atlas. Please ensure MONGODB_URI is configured in your .env file.\n');
      return;
    }
    const { db } = conn;

    const pricesCol = db.collection('current_prices');
    const priceHistoryCol = db.collection('price_history');
    const ordersCol = db.collection('orders');
    const auditCol = db.collection('audit_logs');

    // 1. Current Prices (5kg, 10kg, 20kg)
    const initialPrices = [
      { packSizeKg: 5, pricePerBag: 650, effectiveAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date().toISOString() },
      { packSizeKg: 10, pricePerBag: 1280, effectiveAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date().toISOString() },
      { packSizeKg: 20, pricePerBag: 2500, effectiveAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date().toISOString() },
    ];

    for (const p of initialPrices) {
      await pricesCol.updateOne(
        { packSizeKg: p.packSizeKg },
        { $set: p },
        { upsert: true }
      );
    }
    console.log('[Seed] Current prices initialized (5kg: Rs. 650, 10kg: Rs. 1,280, 20kg: Rs. 2,500)');

    // 2. Initial Price History
    const historyCount = await priceHistoryCol.countDocuments();
    if (historyCount === 0) {
      const sampleHistory = [
        {
          packSizeKg: 10,
          previousPrice: 1250,
          newPrice: 1280,
          effectiveAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          packSizeKg: 20,
          previousPrice: 2450,
          newPrice: 2500,
          effectiveAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      await priceHistoryCol.insertMany(sampleHistory);
      console.log('[Seed] Sample price history added');
    }

    // 3. Initial Orders
    const ordersCount = await ordersCol.countDocuments();
    if (ordersCount === 0) {
      const now = Date.now();
      const sampleOrders = [
        {
          orderNumber: 'ORD-202610-001',
          customerName: 'Muhammad Tariq',
          deliveryAddress: 'House 42, Block C, Model Town, Lahore',
          packSizeKg: 20,
          quantity: 2,
          pricePerBag: 2500,
          totalAmount: 5000,
          status: 'delivered',
          notes: 'Deliver before 6 PM; ring bell twice',
          createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
          deliveredAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          orderNumber: 'ORD-202610-002',
          customerName: 'Ayesha Siddiqui',
          deliveryAddress: 'Apartment 4B, Creek Vista, Phase 8, DHA, Karachi',
          packSizeKg: 10,
          quantity: 3,
          pricePerBag: 1280,
          totalAmount: 3840,
          status: 'delivered',
          notes: 'Call on arrival for security gate clearance',
          createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
          deliveredAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          orderNumber: 'ORD-202610-003',
          customerName: 'Usman Ali Khan',
          deliveryAddress: 'Street 14, Sector F-8/2, Islamabad',
          packSizeKg: 5,
          quantity: 4,
          pricePerBag: 650,
          totalAmount: 2600,
          status: 'active',
          notes: 'Freshly ground whole wheat only',
          createdAt: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
          orderNumber: 'ORD-202610-004',
          customerName: 'Bilal Ahmad',
          deliveryAddress: 'House 19, Lane 3, Askari 10, Lahore',
          packSizeKg: 10,
          quantity: 2,
          pricePerBag: 1280,
          totalAmount: 2560,
          status: 'active',
          notes: 'Leave with guard if unavailable',
          createdAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
          orderNumber: 'ORD-202610-005',
          customerName: 'Fatima Zahra',
          deliveryAddress: 'Flat 302, Palm Residency, Gulshan-e-Iqbal, Karachi',
          packSizeKg: 20,
          quantity: 1,
          pricePerBag: 2500,
          totalAmount: 2500,
          status: 'cancelled',
          cancellationReason: 'Customer requested order reschedule for next week',
          notes: 'Cancel requested via phone call',
          createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
          cancelledAt: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 18 * 60 * 60 * 1000).toISOString(),
        },
        {
          orderNumber: 'ORD-202610-006',
          customerName: 'Khurram Shehzad',
          deliveryAddress: 'Plot 88, Commercial Broadway, DHA Phase 5, Lahore',
          packSizeKg: 20,
          quantity: 5,
          pricePerBag: 2500,
          totalAmount: 12500,
          status: 'active',
          notes: 'Bakery kitchen intake at rear gate',
          createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        },
      ];

      await ordersCol.insertMany(sampleOrders);
      console.log(`[Seed] Inserted ${sampleOrders.length} initial orders (Active, Delivered, Cancelled)`);
    }

    // 4. Sample Audit Log
    const auditCount = await auditCol.countDocuments();
    if (auditCount === 0) {
      await auditCol.insertOne({
        actionType: 'SYSTEM_INIT',
        entityId: 'seed',
        details: { message: 'Daily Dough Atta Chaki database initialized' },
        timestamp: new Date().toISOString(),
      });
      console.log('[Seed] System initialization audit record created');
    }

    console.log('[Seed] Database seeding completed successfully!');
  } catch (err) {
    console.error('[Seed] Seeding error:', err);
  } finally {
    await closeDatabase();
  }
}

seed();
