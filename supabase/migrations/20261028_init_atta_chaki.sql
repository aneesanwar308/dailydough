-- =============================================================================
-- Migration: Atta Chaki Admin Console (Daily Dough) Schema & Policies
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: current_prices
CREATE TABLE IF NOT EXISTS public.current_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pack_size_kg INTEGER UNIQUE NOT NULL CHECK (pack_size_kg IN (5, 10, 20)),
    price_per_bag NUMERIC(10, 2) NOT NULL CHECK (price_per_bag > 0),
    effective_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table: price_history
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pack_size_kg INTEGER NOT NULL CHECK (pack_size_kg IN (5, 10, 20)),
    previous_price NUMERIC(10, 2) NULL,
    new_price NUMERIC(10, 2) NOT NULL CHECK (new_price > 0),
    effective_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Table: orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    pack_size_kg INTEGER NOT NULL CHECK (pack_size_kg IN (5, 10, 20)),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_bag NUMERIC(10, 2) NOT NULL CHECK (price_per_bag > 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'delivered', 'cancelled')),
    notes TEXT NULL,
    cancellation_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    delivered_at TIMESTAMPTZ NULL,
    cancelled_at TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Table: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for optimal lookup & reporting
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_pack_size ON public.orders(pack_size_kg);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON public.price_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Initial seed rates for 5kg, 10kg, and 20kg
INSERT INTO public.current_prices (pack_size_kg, price_per_bag)
VALUES 
    (5, 650.00),
    (10, 1280.00),
    (20, 2500.00)
ON CONFLICT (pack_size_kg) DO NOTHING;
