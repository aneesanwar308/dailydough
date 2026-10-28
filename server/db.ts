import { MongoClient, Db, Collection, Document } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const rawUri = process.env.MONGODB_URI;
const uri = rawUri || '';
const dbName = process.env.DB_NAME || 'dailydough';

let client: MongoClient | null = null;
let db: Db | null = null;
let connectionAttempted = false;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db } | null> {
  if (client && db) {
    return { client, db };
  }

  if (!uri || uri.includes('yourpassword') || uri.includes('cluster0.xxxxx.mongodb.net')) {
    if (!connectionAttempted) {
      console.warn('\n========================================================================');
      console.warn('[MongoDB Atlas Notice]');
      console.warn('No MONGODB_URI found or placeholder is still active in .env file.');
      console.warn('To connect to your cloud database, add your connection string to .env:');
      console.warn('MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/dailydough?retryWrites=true&w=majority');
      console.warn('The application is running safely in Local / Offline Storage Mode.');
      console.warn('========================================================================\n');
      connectionAttempted = true;
    }
    return null;
  }

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(dbName);
    console.log(`[MongoDB Atlas] Successfully connected to database: "${dbName}"`);

    // Ensure collections and unique indexes exist
    await initCollectionsAndIndexes(db);

    return { client, db };
  } catch (error) {
    console.error('[MongoDB Atlas] Connection failed:', (error as Error).message);
    client = null;
    db = null;
    return null;
  }
}

export function isConnected(): boolean {
  return db !== null;
}

export async function getDb(): Promise<Db | null> {
  if (!db) {
    const conn = await connectToDatabase();
    return conn ? conn.db : null;
  }
  return db;
}

async function initCollectionsAndIndexes(database: Db) {
  try {
    const ordersCol = database.collection('orders');
    await ordersCol.createIndex({ orderNumber: 1 }, { unique: true });
    await ordersCol.createIndex({ status: 1 });
    await ordersCol.createIndex({ createdAt: -1 });
    await ordersCol.createIndex({ packSizeKg: 1 });

    const pricesCol = database.collection('current_prices');
    await pricesCol.createIndex({ packSizeKg: 1 }, { unique: true });

    const priceHistoryCol = database.collection('price_history');
    await priceHistoryCol.createIndex({ createdAt: -1 });

    const auditCol = database.collection('audit_logs');
    await auditCol.createIndex({ timestamp: -1 });

    console.log('[MongoDB Atlas] Indexes verified successfully');
  } catch (err) {
    console.warn('[MongoDB Atlas] Index setup warning (non-fatal):', err);
  }
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
