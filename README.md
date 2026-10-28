# Daily Dough — Atta Chaki Admin Console

A production-grade, internal management console built for a local **Atta Chaki** (flour mill) business in Pakistan. It provides complete workflows to manage customer orders for 5 kg, 10 kg, and 20 kg flour bags, lock immutable price snapshots per order, transition statuses (Active, Delivered, Cancelled), manage pack prices with historical audit logging, analyze real-time business KPIs, and export filtered reports to CSV.

---

## 1. Features & Architectural Highlights

- **Permanent Price Snapshotting**:
  - When an order is created, the current pack rate is frozen into `pricePerBag` and `totalAmount = pricePerBag × quantity`.
  - Future price adjustments **never mutate** previous active, delivered, or cancelled orders.
- **Data Storage**:
  - **MongoDB Atlas**: Official MongoDB native driver with Express REST API (`server/`) managing collections with indexes.
  - **Offline / Local Sandbox Fallback**: If MongoDB credentials are not yet configured or the server is offline, the app operates smoothly in local browser storage mode with initial Pakistani seed data.
  - **Dual Mode Status Badge**: Live visual indicator in the sidebar showing connection status ("MongoDB Atlas" vs "Local Storage").
- **Real-Time Financial & Operational KPIs (15 Metrics)**:
  - Total Delivered Revenue, Pending Order Value, Cancelled Order Value
  - Total Orders, Delivered Orders, Cancelled Orders, Active Queue
  - Bags Delivered, Bags Pending, Bags Cancelled
  - Delivery Completion Rate (`delivered / (delivered + cancelled + active)`)
  - Cancellation Rate (`cancelled / total orders`)
  - Average Delivered Order Value, Average Bags Per Order, Average Revenue Per Delivery
- **Timezone & Currency**:
  - Native **Asia/Karachi** (PKT, UTC+5) datetime conventions with inclusive date boundaries.
  - **PKR** currency formatting (e.g. `Rs. 1,250`).
- **Data Export**:
  - One-click CSV export of filtered orders and summary metrics.

---

## 2. Project Structure

```
dailydough/
├── server/
│   ├── db.ts               # MongoDB Atlas connection manager & index initialization
│   ├── index.ts            # Express REST API (Orders, Prices, Audit Logs, Health)
│   └── seed.ts             # Database seeder with Pakistani Atta Chaki sample data
├── src/
│   ├── components/
│   │   ├── common/         # MetricCard, Modal, ConfirmDialog, Badge, DateFilter, Pagination, Toast
│   │   ├── layout/         # Sidebar (with count badges & status) and Header (Karachi clock)
│   │   ├── orders/         # NewOrderModal, EditOrderModal, OrderDetailsModal, Active/Delivered/Cancelled Tables
│   │   ├── prices/         # PriceManagementView, UpdatePriceModal
│   │   ├── dashboard/      # DashboardView (15 KPI cards, Recharts trends & distributions)
│   │   └── reports/        # ReportsView (Top customers, daily breakdown, pack size sales, CSV export)
│   ├── context/
│   │   └── AppContext.tsx  # Centralized state management & business action handlers
│   ├── lib/
│   │   ├── api.ts          # Unified service connecting to /api with local storage fallback
│   │   ├── calculations.ts # Strict KPI math, date boundaries, and chart aggregations
│   │   ├── formatters.ts   # PKR currency and Asia/Karachi datetime formatting
│   │   ├── exportCsv.ts    # Filter-respecting CSV exporter
│   │   └── seedData.ts     # Initial seed dataset for Pakistani operations
│   ├── tests/
│   │   └── calculations.test.ts # Vitest suite covering all 12 business rules
│   ├── types/
│   │   └── index.ts        # TypeScript data models
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css           # Tailwind directives and clean typography
├── supabase/
│   └── migrations/         # Supabase PostgreSQL schema migration (alternative target)
├── .env.example            # Environment variables template
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts          # Vite configuration with API proxy to port 5001
```

---

## 3. Getting Started

### Step 1: Install Dependencies
Run in the project directory:
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and specify your MongoDB Atlas connection URI:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/dailydough?retryWrites=true&w=majority
PORT=5001
```

*(Note: If you leave `MONGODB_URI` blank or run without MongoDB initially, the app will automatically boot into Local Storage Mode so you can test all features right away).*

### Step 3: Seed Initial Data (Optional for MongoDB Atlas)
To populate MongoDB Atlas with initial Pakistani rates (5kg: Rs. 650, 10kg: Rs. 1,280, 20kg: Rs. 2,500) and sample orders:
```bash
npm run seed
```

### Step 4: Run Development Server
```bash
npm run dev
```
This runs both the Vite frontend (`http://localhost:3000`) and the Express backend (`http://localhost:5001`) concurrently.

---

## 4. Running Automated Tests

Run the test suite verifying all 12 acceptance criteria (price snapshot freezing, revenue isolation, zero-denominator guards, rate formulas):
```bash
npm test
```

---

## 5. Acceptance Criteria Checklist

| # | Acceptance Criterion | Implementation Status |
|---|----------------------|-----------------------|
| 1 | Create order with customer name, address, pack size, quantity | Supported in `NewOrderModal` with double-submit guard |
| 2 | Current pack price automatically applied | Dynamic price lookup for 5kg, 10kg, 20kg |
| 3 | Stored order total never changes after later price updates | Permanent price snapshot saved in database and validated in tests |
| 4 | Mark active order as delivered with confirmation & timestamp | `ActiveOrdersTable` -> records `deliveredAt` -> moves to `DeliveredOrdersTable` |
| 5 | Cancel active order with confirmation & optional reason | `ActiveOrdersTable` -> records `cancelledAt` -> moves to `CancelledOrdersTable` |
| 6 | Delivered revenue only counts delivered orders | Delivered orders calculate by `deliveredAt`; active & cancelled reported separately |
| 7 | Dashboard statistics & Recharts update immediately | Real-time calculations across 15 KPIs and 4 charts |
| 8 | Date filter toolbar with standard & custom ranges | Today, Yesterday, 7D, 30D, This/Last Week, This/Last Month, Year, Custom |
| 9 | CSV Export for orders and summary KPIs | `exportOrdersToCsv` & `exportSummaryToCsv` with inclusive dates |
| 10 | Price Management with historical audit log | `PriceManagementView` displays active prices and complete historical rate change log |
| 11 | Audit log of all actions | Every order created, edited, delivered, cancelled, and price updated is logged |
| 12 | Production reliability & offline fallback | Runs with MongoDB Atlas or in local storage fallback with zero configuration |
