-- ==============================================================================
-- GNH PRASADAM & EXPENSE MANAGEMENT APP - SUPABASE POSTGRESQL SCHEMA & SEED DATA
-- ==============================================================================

-- 1. Devotees and Family Mapping
CREATE TABLE IF NOT EXISTS devotees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    family_members JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{"name": "Ram Das", "phone_number": "9876543201"}, {"name": "Sita Devi", "phone_number": "9876543299"}, {"name": "Laxman Das"}]
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily Prasadam Counts
CREATE TABLE IF NOT EXISTS prasadam_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devotee_id UUID REFERENCES devotees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    breakfast_count INT DEFAULT 0 CHECK (breakfast_count >= 0),
    lunch_count INT DEFAULT 0 CHECK (lunch_count >= 0),
    dinner_count INT DEFAULT 0 CHECK (dinner_count >= 0),
    is_auto_filled BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(devotee_id, date)
);

-- 3. Expenses (Regular & Janmashtami)
DO $$ BEGIN
    CREATE TYPE expense_type AS ENUM ('REGULAR', 'JANMASHTAMI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE expense_status AS ENUM ('APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devotee_id UUID REFERENCES devotees(id) ON DELETE SET NULL,
    guest_name VARCHAR(100),
    type expense_type NOT NULL DEFAULT 'REGULAR',
    payer_name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL, -- Supports negative values
    comments TEXT,
    bill_url TEXT,
    status expense_status DEFAULT 'APPROVED',
    rejection_reason TEXT,
    cycle_month VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Monthly Ledgers & Carry-Over Balances
DO $$ BEGIN
    CREATE TYPE settlement_state AS ENUM ('UNSETTLED', 'PENDING_VERIFICATION', 'SETTLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS monthly_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devotee_id UUID REFERENCES devotees(id) ON DELETE CASCADE,
    cycle_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    carried_forward_amount NUMERIC(10, 2) DEFAULT 0.00,
    settlement_amount_reported NUMERIC(10, 2) DEFAULT 0.00,
    settlement_date_reported DATE,
    settlement_status settlement_state DEFAULT 'UNSETTLED',
    admin_notes TEXT,
    UNIQUE(devotee_id, cycle_month)
);

-- 5. System Configuration
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL
);

-- Seed 6-Digit Admin PIN hash (192108) and default settings
INSERT INTO system_config (key, value) VALUES 
    ('admin_pin_hash', '192108'),
    ('breakfast_rate', '40'),
    ('lunch_rate', '80'),
    ('dinner_rate', '40'),
    ('cutoff_time', '20:00')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Enable Row Level Security (RLS) & Public Policies for App operations
ALTER TABLE devotees ENABLE ROW LEVEL SECURITY;
ALTER TABLE prasadam_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for devotees" ON devotees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for prasadam_counts" ON prasadam_counts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for monthly_ledgers" ON monthly_ledgers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for system_config" ON system_config FOR ALL USING (true) WITH CHECK (true);

-- 6. Seed Dataset: 30 Devotees and Family Members
INSERT INTO devotees (id, phone_number, group_name, family_members, is_admin) VALUES
('d1000000-0000-0000-0000-000000000001', '9876543201', 'Ram Das Group', '[{"name": "Ram Das", "phone_number": "9876543201"}, {"name": "Sita Devi", "phone_number": "9876543299"}, {"name": "Laxman Das", "phone_number": ""}]'::jsonb, TRUE),
('d1000000-0000-0000-0000-000000000002', '9876543202', 'Govinda Priya Group', '[{"name": "Govinda Das", "phone_number": "9876543202"}, {"name": "Priya Radhika Devi", "phone_number": "9876543298"}, {"name": "Gopal", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000003', '9876543203', 'Madhava Charan Group', '[{"name": "Madhava Das", "phone_number": "9876543203"}, {"name": "Yamuna Devi", "phone_number": "9876543297"}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000004', '9876543204', 'Mukunda Sevak Group', '[{"name": "Mukunda Das", "phone_number": "9876543204"}, {"name": "Tulasi Priya Devi", "phone_number": "9876543296"}, {"name": "Nimai", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000005', '9876543205', 'Damodar Prasad Group', '[{"name": "Damodar Das", "phone_number": "9876543205"}, {"name": "Lalita Devi", "phone_number": "9876543295"}, {"name": "Nitai", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000006', '9876543206', 'Ananda Murari Group', '[{"name": "Ananda Das", "phone_number": "9876543206"}, {"name": "Vishakha Devi", "phone_number": "9876543294"}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000007', '9876543207', 'Chaitanya Prem Group', '[{"name": "Chaitanya Das", "phone_number": "9876543207"}, {"name": "Padmavati Devi", "phone_number": "9876543293"}, {"name": "Gauranga", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000008', '9876543208', 'Gauranga Sundar Group', '[{"name": "Gauranga Das", "phone_number": "9876543208"}, {"name": "Malati Devi", "phone_number": "9876543292"}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000009', '9876543209', 'Hari Bhakt Group', '[{"name": "Hari Das", "phone_number": "9876543209"}, {"name": "Kunti Devi", "phone_number": "9876543291"}, {"name": "Arjuna", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000010', '9876543210', 'Jagannath Seva Group', '[{"name": "Jagannath Das", "phone_number": "9876543210"}, {"name": "Subhadra Devi", "phone_number": "9876543290"}, {"name": "Baladev", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000011', '9876543211', 'Keshav Kripa Group', '[{"name": "Keshav Das", "phone_number": "9876543211"}, {"name": "Gandhari Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000012', '9876543212', 'Murari Gupta Group', '[{"name": "Murari Das", "phone_number": "9876543212"}, {"name": "Saraswati Devi", "phone_number": ""}, {"name": "Madhu", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000013', '9876543213', 'Narayan Smaran Group', '[{"name": "Narayan Das", "phone_number": "9876543213"}, {"name": "Lakshmi Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000014', '9876543214', 'Radha Raman Group', '[{"name": "Radha Raman Das", "phone_number": "9876543214"}, {"name": "Chandravati Devi", "phone_number": ""}, {"name": "Keshava", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000015', '9876543215', 'Syamasundar Group', '[{"name": "Syama Das", "phone_number": "9876543215"}, {"name": "Ananga Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000016', '9876543216', 'Vrindavan Das Group', '[{"name": "Vrindavan Das", "phone_number": "9876543216"}, {"name": "Jahnava Devi", "phone_number": ""}, {"name": "Balaram", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000017', '9876543217', 'Bhakti Vinod Group', '[{"name": "Bhakti Das", "phone_number": "9876543217"}, {"name": "Bimala Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000018', '9876543218', 'Gopinath Charan Group', '[{"name": "Gopinath Das", "phone_number": "9876543218"}, {"name": "Hemalata Devi", "phone_number": ""}, {"name": "Sudama", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000019', '9876543219', 'Rasik Murari Group', '[{"name": "Rasik Das", "phone_number": "9876543219"}, {"name": "Indulekha Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000020', '9876543220', 'Vrajendranandan Group', '[{"name": "Vraja Das", "phone_number": "9876543220"}, {"name": "Champakalata Devi", "phone_number": ""}, {"name": "Govardhan", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000021', '9876543221', 'Baladev Bhakti Group', '[{"name": "Baladev Das", "phone_number": "9876543221"}, {"name": "Revati Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000022', '9876543222', 'Advaita Acharya Group', '[{"name": "Advaita Das", "phone_number": "9876543222"}, {"name": "Sita Devi (Advaita)", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000023', '9876543223', 'Srivas Pandit Group', '[{"name": "Srivas Das", "phone_number": "9876543223"}, {"name": "Malini Devi", "phone_number": ""}, {"name": "Narayani", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000024', '9876543224', 'Gadadhar Seva Group', '[{"name": "Gadadhar Das", "phone_number": "9876543224"}, {"name": "Tungavidya Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000025', '9876543225', 'Sanatan Goswami Group', '[{"name": "Sanatan Das", "phone_number": "9876543225"}, {"name": "Chitra Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000026', '9876543226', 'Rupa Goswami Group', '[{"name": "Rupa Das", "phone_number": "9876543226"}, {"name": "Sudevi Devi", "phone_number": ""}, {"name": "Jiva", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000027', '9876543227', 'Raghunath Bhatta Group', '[{"name": "Raghunath Das", "phone_number": "9876543227"}, {"name": "Rangadevi Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000028', '9876543228', 'Gopal Bhatta Group', '[{"name": "Gopal Bhatta Das", "phone_number": "9876543228"}, {"name": "Gauri Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000029', '9876543229', 'Loknath Seva Group', '[{"name": "Loknath Das", "phone_number": "9876543229"}, {"name": "Kalavati Devi", "phone_number": ""}]'::jsonb, FALSE),
('d1000000-0000-0000-0000-000000000030', '9876543230', 'Narottam Das Group', '[{"name": "Narottam Das", "phone_number": "9876543230"}, {"name": "Anuradha Devi", "phone_number": ""}, {"name": "Madhur", "phone_number": ""}]'::jsonb, FALSE)
ON CONFLICT (phone_number) DO NOTHING;

-- Supabase Storage Bucket Setup (Create 'bills' bucket for receipt uploads)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bills', 'bills', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public storage uploads to bills" ON storage.objects 
FOR ALL USING (bucket_id = 'bills') WITH CHECK (bucket_id = 'bills');
