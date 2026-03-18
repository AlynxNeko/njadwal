# 🗓️ NJADWAL — Master Build Guide (v2)
## Part 1: Manual Setup

> **Removed:** WhatsApp, Facebook SSO  
> **Updated:** Xendit QRIS shown inline on booking page  
> **Auth:** Google SSO + Email/Password only

---

## ✅ SETUP ORDER

```
1. Supabase → 2. Xendit → 3. VPS/DNS → 4. n8n (lightweight, no WA)
```

---

## 🔷 STEP 1: SUPABASE SETUP

### 1.1 Create Project
1. Go to https://supabase.com → New Project
2. Name: `njadwal-prod`
3. Region: **Southeast Asia (Singapore)**
4. Save your `anon key`, `service_role key`, and `project URL`

### 1.2 Enable Auth Providers

**Go to:** Authentication → Providers

**Email/Password:** Enable ✅, Confirm email: ON

**Google SSO only:**
1. Go to https://console.cloud.google.com → New Project: `njadwal`
2. APIs & Services → OAuth consent screen → External → Fill company info
3. Credentials → Create OAuth 2.0 Client ID → Web Application
4. Authorized redirect URIs:
   ```
   https://<your-project>.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback  ← for local dev
   ```
5. Copy Client ID + Secret → paste into Supabase Google provider

### 1.3 Run SQL Schema

```sql
-- =============================================
-- NJADWAL DATABASE SCHEMA v2
-- No WhatsApp quota tracking
-- All timestamps stored in UTC
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SUBSCRIPTION PLANS
-- =============================================
CREATE TABLE public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_idr INTEGER NOT NULL,
  max_calendars INTEGER NOT NULL,
  max_staff INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO public.subscription_plans VALUES
  ('solo',   'Solo',   99000,  1,  1,  '["1 Kalender", "QRIS Dinamis", "Booking Unlimited"]'),
  ('studio', 'Studio', 199000, 10, 10, '["Kalender Multi-Staff", "QRIS Dinamis", "Booking Unlimited", "Google Calendar Sync"]');

-- =============================================
-- MERCHANTS
-- =============================================
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  business_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  logo_url TEXT,
  cover_url TEXT,

  booking_color TEXT DEFAULT '#0f766e',
  booking_welcome_msg TEXT,

  -- Google Calendar (optional)
  google_calendar_id TEXT,
  google_refresh_token TEXT,

  -- Xendit Sub-account
  xendit_sub_account_id TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS (simplified — no WA quota)
-- =============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'trial')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  xendit_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STAFF
-- =============================================
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),

  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  calendar_color TEXT DEFAULT '#0f766e',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SERVICES
-- =============================================
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_idr INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  staff_ids UUID[] DEFAULT NULL,

  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AVAILABILITY
-- =============================================
CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,

  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,

  UNIQUE(merchant_id, staff_id, day_of_week)
);

CREATE TABLE public.availability_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,

  override_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,

  UNIQUE(merchant_id, staff_id, override_date)
);

-- =============================================
-- BOOKINGS
-- =============================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  service_id UUID NOT NULL REFERENCES public.services(id),
  staff_id UUID REFERENCES public.staff(id),

  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,

  -- Time (UTC stored, local cached)
  start_time_utc TIMESTAMPTZ NOT NULL,
  end_time_utc TIMESTAMPTZ NOT NULL,
  local_date DATE NOT NULL,
  local_start_time TIME NOT NULL,
  timezone TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'confirmed', 'completed', 'cancelled', 'no_show')),

  -- Payment
  amount_idr INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'free')),

  -- Xendit fields
  xendit_invoice_id TEXT,
  xendit_external_id TEXT UNIQUE,  -- 'NJADWAL-{booking_id}'
  xendit_qr_string TEXT,           -- raw QR string for rendering
  xendit_qr_url TEXT,              -- QR image URL from Xendit
  xendit_va_number TEXT,
  xendit_payment_method TEXT,      -- 'QRIS', 'BCA', 'MANDIRI', etc.
  xendit_invoice_url TEXT,         -- fallback full Xendit page
  xendit_invoice_expires_at TIMESTAMPTZ,

  paid_at TIMESTAMPTZ,
  google_event_id TEXT,
  notes TEXT,
  booking_source TEXT DEFAULT 'web',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONCURRENCY: Prevent double-booking
-- =============================================
CREATE UNIQUE INDEX idx_bookings_no_overlap
  ON public.bookings (merchant_id, staff_id, start_time_utc)
  WHERE status NOT IN ('cancelled');

CREATE UNIQUE INDEX idx_bookings_no_overlap_no_staff
  ON public.bookings (merchant_id, start_time_utc)
  WHERE staff_id IS NULL AND status NOT IN ('cancelled');

-- Concurrency-safe booking function
CREATE OR REPLACE FUNCTION public.book_slot(
  p_merchant_id UUID,
  p_staff_id UUID,
  p_service_id UUID,
  p_start_time_utc TIMESTAMPTZ,
  p_end_time_utc TIMESTAMPTZ,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_amount_idr INTEGER,
  p_local_date DATE,
  p_local_start_time TIME,
  p_timezone TEXT
)
RETURNS TABLE(booking_id UUID, external_id TEXT, error TEXT) AS $$
DECLARE
  v_booking_id UUID;
  v_external_id TEXT;
  v_lock_key BIGINT;
  v_conflict_count INTEGER;
BEGIN
  v_lock_key := abs(hashtext(p_merchant_id::text || COALESCE(p_staff_id::text,'') || p_start_time_utc::text));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT COUNT(*) INTO v_conflict_count
  FROM public.bookings
  WHERE merchant_id = p_merchant_id
    AND (p_staff_id IS NULL OR staff_id = p_staff_id)
    AND status NOT IN ('cancelled')
    AND (start_time_utc, end_time_utc) OVERLAPS (p_start_time_utc, p_end_time_utc);

  IF v_conflict_count > 0 THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, 'SLOT_TAKEN'::TEXT;
    RETURN;
  END IF;

  v_booking_id := uuid_generate_v4();
  v_external_id := 'NJADWAL-' || v_booking_id::text;

  INSERT INTO public.bookings (
    id, merchant_id, staff_id, service_id,
    customer_name, customer_phone, customer_email,
    start_time_utc, end_time_utc,
    local_date, local_start_time, timezone,
    amount_idr, status, xendit_external_id
  ) VALUES (
    v_booking_id, p_merchant_id, p_staff_id, p_service_id,
    p_customer_name, p_customer_phone, p_customer_email,
    p_start_time_utc, p_end_time_utc,
    p_local_date, p_local_start_time, p_timezone,
    p_amount_idr, 'pending_payment', v_external_id
  );

  RETURN QUERY SELECT v_booking_id, v_external_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "merchants_owner" ON public.merchants FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "merchants_public_read" ON public.merchants FOR SELECT USING (is_active = true);

CREATE POLICY "services_owner" ON public.services FOR ALL USING (
  merchant_id IN (SELECT id FROM public.merchants WHERE owner_id = auth.uid())
);
CREATE POLICY "services_public_read" ON public.services FOR SELECT USING (is_active = true);

CREATE POLICY "bookings_merchant" ON public.bookings FOR ALL USING (
  merchant_id IN (SELECT id FROM public.merchants WHERE owner_id = auth.uid())
);
CREATE POLICY "bookings_anon_insert" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_anon_read_own" ON public.bookings FOR SELECT USING (true);

CREATE POLICY "subscriptions_merchant" ON public.subscriptions FOR ALL USING (
  merchant_id IN (SELECT id FROM public.merchants WHERE owner_id = auth.uid())
);

CREATE POLICY "staff_merchant" ON public.staff FOR ALL USING (
  merchant_id IN (SELECT id FROM public.merchants WHERE owner_id = auth.uid())
);
CREATE POLICY "staff_public_read" ON public.staff FOR SELECT USING (is_active = true);

CREATE POLICY "availability_public_read" ON public.availability FOR SELECT USING (true);
CREATE POLICY "availability_merchant" ON public.availability FOR ALL USING (
  merchant_id IN (SELECT id FROM public.merchants WHERE owner_id = auth.uid())
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_bookings_merchant ON public.bookings(merchant_id);
CREATE INDEX idx_bookings_start_time ON public.bookings(start_time_utc);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_local_date ON public.bookings(merchant_id, local_date);
CREATE INDEX idx_bookings_external_id ON public.bookings(xendit_external_id);
CREATE INDEX idx_merchants_slug ON public.merchants(slug);
CREATE INDEX idx_services_merchant ON public.services(merchant_id);
```

### 1.4 Get Your Keys
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## 🔷 STEP 2: XENDIT SETUP

### 2.1 Create Xendit Account
1. https://dashboard.xendit.co → Create account
2. Complete KYB verification
3. Request **XenPlatform** activation (email Xendit support)

### 2.2 QRIS Setup
1. Dashboard → Accept Payments → QRIS → Apply for QRIS
2. Fill merchant category info
3. Approval takes 1-3 business days
4. Once approved, QRIS is auto-available on all invoices

### 2.3 Webhook Configuration
Dashboard → Developers → Webhooks:
```
Invoice Paid:    https://njadwal.autoable.cloud/api/webhooks/xendit
Invoice Expired: https://njadwal.autoable.cloud/api/webhooks/xendit
```

Get your callback token:
```
XENDIT_WEBHOOK_TOKEN=xxxxxxxxxxx
```

### 2.4 API Keys
```
XENDIT_SECRET_KEY=xnd_production_xxxx
```

### 2.5 How QRIS-on-page works
When creating an invoice, Xendit returns a `qr_code` object with:
- `qr_string` — the raw string you render as a QR code on your page
- Your page polls `/api/payment-status?booking_id=xxx` every 3 seconds
- When paid, Xendit webhook fires → you update Supabase → page redirects to success

---

## 🔷 STEP 3: VPS & DNS SETUP

### 3.1 DNS
```
A  njadwal  →  your-vps-ip
A  n8n      →  your-vps-ip  (already done)
```

### 3.2 Install Node.js + PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pm2
```

### 3.3 Nginx Config
```bash
sudo nano /etc/nginx/sites-available/njadwal
```

```nginx
server {
    listen 80;
    server_name njadwal.autoable.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name njadwal.autoable.cloud;

    ssl_certificate /etc/letsencrypt/live/njadwal.autoable.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/njadwal.autoable.cloud/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/njadwal /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d njadwal.autoable.cloud
```

---

## 🔷 STEP 4: N8N SETUP (Lightweight — no WA)

n8n now only handles:
- Sending **email notifications** (optional, via SMTP) on booking confirmed
- Monthly subscription renewal checks (future)

For MVP you can skip n8n entirely if you don't need email.  
The payment webhook is handled directly by Next.js API route.

### n8n env vars (if used)
```bash
N8N_WEBHOOK_SECRET=njadwal_internal_secret_2024
WEBHOOK_URL=https://n8n.autoable.cloud/
GENERIC_TIMEZONE=Asia/Jakarta
```

---

## 📋 ALL ENVIRONMENT VARIABLES

```env
# ========= SUPABASE =========
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ========= XENDIT =========
XENDIT_SECRET_KEY=
XENDIT_WEBHOOK_TOKEN=

# ========= APP =========
NEXT_PUBLIC_APP_URL=https://njadwal.autoable.cloud
NEXT_PUBLIC_APP_NAME=Njadwal
```

---

## 🔒 SECURITY CHECKLIST

```
[ ] Supabase service role key NEVER in frontend code
[ ] Xendit callbacks verified with x-callback-token header
[ ] All API keys in .env.local (never in git)
[ ] RLS enabled on all Supabase tables
[ ] .env.local in .gitignore
[ ] HTTPS enforced
[ ] Xendit webhook only from Xendit IPs (optional but good)
```
# 💻 NJADWAL v2 — Part 2: Antigravity Tasks (Complete Next.js Code)

> **Removed:** WhatsApp, Facebook SSO, n8n dependency for payments  
> **Key change:** Xendit QRIS rendered inline, polling for payment status  
> **Auth:** Google SSO + Email/Password only  
> Design: DM Sans + Instrument Serif, teal (#0f766e), white/minimal

---

## 📁 PROJECT STRUCTURE

```
njadwal/
├── app/
│   ├── (marketing)/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── bookings/page.tsx
│   │   ├── services/
│   │   │   ├── page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── staff/page.tsx
│   │   └── settings/page.tsx
│   ├── book/
│   │   └── [slug]/
│   │       ├── page.tsx
│   │       ├── checkout/
│   │       │   └── page.tsx      ← QRIS payment page
│   │       └── success/page.tsx
│   ├── api/
│   │   ├── webhooks/xendit/route.ts
│   │   ├── bookings/
│   │   │   ├── route.ts
│   │   │   └── availability/route.ts
│   │   ├── checkout/route.ts
│   │   └── payment-status/route.ts   ← polling endpoint
│   ├── auth/callback/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── landing/
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── Pricing.tsx
│   │   └── Footer.tsx
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   └── StatsCard.tsx
│   └── booking/
│       ├── ServicePicker.tsx
│       ├── DateTimePicker.tsx
│       ├── CustomerForm.tsx
│       └── QRISCheckout.tsx      ← inline QR display + polling
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── xendit.ts
│   ├── timezone.ts
│   └── utils.ts
├── middleware.ts
├── .env.local
├── package.json
├── tailwind.config.ts
└── next.config.js
```

---

## 📄 package.json

```json
{
  "name": "njadwal",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18",
    "react-dom": "^18",
    "@supabase/supabase-js": "^2.43.0",
    "@supabase/ssr": "^0.3.0",
    "xendit-node": "^6.0.0",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.1.3",
    "lucide-react": "^0.383.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "react-hot-toast": "^2.4.1",
    "qrcode.react": "^3.1.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.4.1",
    "postcss": "^8",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.2.0"
  }
}
```

---

## 📄 .env.local

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Xendit
XENDIT_SECRET_KEY=xnd_production_xxxx
XENDIT_WEBHOOK_TOKEN=your_xendit_callback_token

# App
NEXT_PUBLIC_APP_URL=https://njadwal.autoable.cloud
NEXT_PUBLIC_APP_NAME=Njadwal
```

---

## 📄 tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Instrument Serif', 'serif'],
      },
      colors: {
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        }
      }
    },
  },
  plugins: [],
}
export default config
```

---

## 📄 app/globals.css

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }

body {
  background: #ffffff;
  color: #1c1917;
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}

html { scroll-behavior: smooth; }

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: #f5f5f4; }
::-webkit-scrollbar-thumb { background: #d6d3d1; border-radius: 3px; }

.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
.delay-400 { animation-delay: 400ms; }
.opacity-0 { opacity: 0; }
```

---

## 📄 app/layout.tsx

```typescript
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Njadwal — Booking Appointment untuk Bisnis Kamu',
  description: 'Platform booking otomatis untuk UMKM Indonesia. Terima janji, kelola jadwal, bayar via QRIS.',
  keywords: 'booking appointment, jadwal online, barbershop, klinik, studio, Indonesia',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '10px', border: '1px solid #e7e5e4' },
            success: { iconTheme: { primary: '#0f766e', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
```

---

## 📄 middleware.ts

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/bookings', '/services', '/schedule', '/staff', '/settings']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return request.cookies.get(name)?.value },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (PROTECTED.some(p => path.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|book).*)'],
}
```

---

## 📄 lib/supabase/client.ts

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

## 📄 lib/supabase/server.ts

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { try { cookieStore.set({ name, value, ...options }) } catch {} },
        remove(name, options) { try { cookieStore.set({ name, value: '', ...options }) } catch {} },
      },
    }
  )
}
```

## 📄 lib/timezone.ts

```typescript
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { format, addMinutes } from 'date-fns'
import { id } from 'date-fns/locale'

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Jakarta',   label: 'WIB — Waktu Indonesia Barat',  offset: '+07:00' },
  { value: 'Asia/Makassar',  label: 'WITA — Waktu Indonesia Tengah', offset: '+08:00' },
  { value: 'Asia/Jayapura',  label: 'WIT — Waktu Indonesia Timur',  offset: '+09:00' },
]

export function localToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, timezone)
}

export function formatLocalDate(utcDate: string, timezone: string): string {
  return formatInTimeZone(new Date(utcDate), timezone, "EEEE, d MMMM yyyy", { locale: id })
}

export function formatLocalTime(utcDate: string, timezone: string): string {
  return formatInTimeZone(new Date(utcDate), timezone, 'HH:mm')
}

export function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = []
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)

  let current = new Date()
  current.setHours(sh, sm, 0, 0)
  const end = new Date()
  end.setHours(eh, em, 0, 0)

  while (current.getTime() + durationMinutes * 60000 <= end.getTime()) {
    slots.push(format(current, 'HH:mm'))
    current = addMinutes(current, durationMinutes)
  }
  return slots
}
```

## 📄 lib/xendit.ts

```typescript
import Xendit from 'xendit-node'

export const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY!,
})

export function formatExternalId(bookingId: string) {
  return `NJADWAL-${bookingId}`
}

export function parseBookingIdFromExternal(externalId: string) {
  return externalId.replace('NJADWAL-', '')
}
```

## 📄 lib/utils.ts

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

export function formatPhoneForDisplay(phone: string): string {
  // 628xxx → 08xxx for display
  if (phone.startsWith('62')) return '0' + phone.slice(2)
  return phone
}

export function normalizePhone(input: string): string {
  let phone = input.replace(/\D/g, '')
  if (phone.startsWith('0')) phone = '62' + phone.slice(1)
  if (!phone.startsWith('62')) phone = '62' + phone
  return phone
}
```

---

## 📄 app/auth/callback/route.ts

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
```

---

## 📄 app/(auth)/login/page.tsx

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) toast.error(error.message)
    else { toast.success('Selamat datang!'); router.push('/dashboard') }
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-display text-sm font-bold">N</span>
            </div>
          </Link>
          <h1 className="font-display text-2xl text-stone-900">Masuk ke Njadwal</h1>
          <p className="text-sm text-stone-400 mt-1">Kelola booking bisnis kamu</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          {/* Google only — no Facebook */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors mb-5"
          >
            <GoogleIcon />
            Lanjutkan dengan Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-300">atau email</span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="email@bisnis.com" required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-stone-600">Password</label>
                <Link href="/forgot-password" className="text-xs text-teal-600 hover:underline">Lupa password?</Link>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-teal-700 text-white rounded-xl text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-60">
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-stone-400 mt-4">
          Belum punya akun?{' '}
          <Link href="/register" className="text-teal-600 font-medium hover:underline">Daftar gratis</Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
```

---

## 📄 app/(auth)/register/page.tsx

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Password minimal 8 karakter'); return }
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    })

    if (error) toast.error(error.message)
    else {
      toast.success('Akun dibuat! Cek email untuk verifikasi.')
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-display text-sm font-bold">N</span>
            </div>
          </Link>
          <h1 className="font-display text-2xl text-stone-900">Buat Akun Gratis</h1>
          <p className="text-sm text-stone-400 mt-1">Mulai terima booking dalam 5 menit</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors mb-5">
            <GoogleIcon />
            Daftar dengan Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-300">atau email</span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Nama Lengkap</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Budi Santoso" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="email@bisnis.com" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Minimal 8 karakter" required minLength={8} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-teal-700 text-white rounded-xl text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-60">
              {loading ? 'Membuat akun...' : 'Buat Akun Gratis'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-stone-400 mt-4">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-teal-600 font-medium hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
```

---

## 📄 app/api/bookings/route.ts

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { localToUTC } from '@/lib/timezone'
import { normalizePhone } from '@/lib/utils'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { merchant_id, service_id, staff_id, date, time, customer_name, customer_phone, customer_email } = body

    const supabase = createClient()

    const { data: merchant } = await supabase.from('merchants').select('timezone').eq('id', merchant_id).single()
    const { data: service } = await supabase.from('services').select('duration_minutes, price_idr').eq('id', service_id).single()

    if (!merchant || !service) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const timezone = merchant.timezone || 'Asia/Jakarta'
    const startUtc = localToUTC(date, time, timezone)
    const endUtc = new Date(startUtc.getTime() + service.duration_minutes * 60000)

    const { data: result, error } = await supabase.rpc('book_slot', {
      p_merchant_id: merchant_id,
      p_staff_id: staff_id || null,
      p_service_id: service_id,
      p_start_time_utc: startUtc.toISOString(),
      p_end_time_utc: endUtc.toISOString(),
      p_customer_name: customer_name,
      p_customer_phone: customer_phone ? normalizePhone(customer_phone) : null,
      p_customer_email: customer_email || null,
      p_amount_idr: service.price_idr,
      p_local_date: date,
      p_local_start_time: time,
      p_timezone: timezone,
    })

    if (error || !result?.[0]?.booking_id) {
      if (result?.[0]?.error === 'SLOT_TAKEN') {
        return NextResponse.json({ error: 'Slot sudah terpesan. Pilih waktu lain.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Gagal membuat booking' }, { status: 500 })
    }

    return NextResponse.json({
      booking_id: result[0].booking_id,
      external_id: result[0].external_id,
      amount_idr: service.price_idr,
      is_free: service.price_idr === 0,
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## 📄 app/api/checkout/route.ts — Creates Xendit Invoice + extracts QRIS

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { xenditClient } from '@/lib/xendit'

export async function POST(req: NextRequest) {
  try {
    const { booking_id } = await req.json()
    const supabase = createClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('*, merchants(business_name, city, xendit_sub_account_id), services(name)')
      .eq('id', booking_id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.amount_idr === 0) return NextResponse.json({ free: true })

    // If invoice already exists (user refreshed), return existing
    if (booking.xendit_invoice_id && booking.xendit_qr_string) {
      return NextResponse.json({
        invoice_id: booking.xendit_invoice_id,
        qr_string: booking.xendit_qr_string,
        invoice_url: booking.xendit_invoice_url,
        expires_at: booking.xendit_invoice_expires_at,
      })
    }

    const expiryTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Create Xendit invoice
    // The invoice comes back with a qr_code object for QRIS
    const invoicePayload: any = {
      external_id: booking.xendit_external_id,
      amount: booking.amount_idr,
      description: `Booking ${booking.services.name} — ${booking.merchants.business_name}`,
      currency: 'IDR',
      invoice_duration: 3600,
      success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/${booking.merchants.slug || ''}/success?booking_id=${booking_id}`,
      failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/book/${booking.merchants.slug || ''}/checkout?booking_id=${booking_id}&error=failed`,
      payment_methods: ['QRIS', 'BCA', 'MANDIRI', 'BNI', 'BRI', 'PERMATA'],
    }

    // Route to merchant's Xendit sub-account if connected
    const headers: any = {}
    if (booking.merchants.xendit_sub_account_id) {
      headers['for-user-id'] = booking.merchants.xendit_sub_account_id
    }

    const invoiceResponse = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY! + ':').toString('base64')}`,
        ...headers,
      },
      body: JSON.stringify(invoicePayload),
    })

    const invoice = await invoiceResponse.json()

    if (!invoiceResponse.ok) {
      console.error('Xendit error:', invoice)
      return NextResponse.json({ error: 'Gagal membuat invoice' }, { status: 500 })
    }

    // Extract QRIS data from invoice
    // Xendit invoice returns available_banks and available_qris_codes
    const qrisData = invoice.available_qris_codes?.[0] || null
    const qrString = qrisData?.qr_string || null
    const qrImageUrl = qrisData?.qr_image_url || null

    // Save to booking
    await supabase.from('bookings').update({
      xendit_invoice_id: invoice.id,
      xendit_invoice_url: invoice.invoice_url,
      xendit_qr_string: qrString,
      xendit_qr_url: qrImageUrl,
      xendit_invoice_expires_at: expiryTime.toISOString(),
    }).eq('id', booking_id)

    return NextResponse.json({
      invoice_id: invoice.id,
      qr_string: qrString,
      qr_image_url: qrImageUrl,
      invoice_url: invoice.invoice_url,
      expires_at: expiryTime.toISOString(),
      // Also return VA options for non-QRIS
      available_banks: invoice.available_banks || [],
    })

  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## 📄 app/api/payment-status/route.ts — Polling endpoint

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const booking_id = searchParams.get('booking_id')

  if (!booking_id) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })

  const supabase = createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('payment_status, status, xendit_invoice_expires_at')
    .eq('id', booking_id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const expired = booking.xendit_invoice_expires_at
    ? new Date(booking.xendit_invoice_expires_at) < now
    : false

  return NextResponse.json({
    payment_status: booking.payment_status,
    booking_status: booking.status,
    is_paid: booking.payment_status === 'paid',
    is_expired: expired && booking.payment_status !== 'paid',
  })
}
```

---

## 📄 app/api/webhooks/xendit/route.ts

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parseBookingIdFromExternal } from '@/lib/xendit'

export async function POST(req: NextRequest) {
  const callbackToken = req.headers.get('x-callback-token')
  if (callbackToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await req.json()
  const supabase = createClient()

  if (payload.status === 'PAID') {
    // external_id = 'NJADWAL-{booking_id}'
    const bookingId = parseBookingIdFromExternal(payload.external_id)

    await supabase.from('bookings').update({
      payment_status: 'paid',
      status: 'confirmed',
      paid_at: new Date().toISOString(),
      xendit_payment_method: payload.payment_method || null,
    }).eq('id', bookingId)
  }

  if (payload.status === 'EXPIRED') {
    const bookingId = parseBookingIdFromExternal(payload.external_id)
    // Don't cancel booking — just let it sit as pending_payment
    // Merchant can manually cancel, or user can create new invoice
    await supabase.from('bookings').update({
      status: 'cancelled',
      payment_status: 'unpaid',
    }).eq('id', bookingId).eq('payment_status', 'unpaid') // only if still unpaid
  }

  return NextResponse.json({ received: true })
}
```

---

## 📄 app/api/bookings/availability/route.ts

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const merchant_id = searchParams.get('merchant_id')
  const date = searchParams.get('date')
  const staff_id = searchParams.get('staff_id') || null

  if (!merchant_id || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const supabase = createClient()
  const { data: merchant } = await supabase.from('merchants').select('timezone').eq('id', merchant_id).single()
  const timezone = merchant?.timezone || 'Asia/Jakarta'

  const startOfDay = fromZonedTime(`${date}T00:00:00`, timezone)
  const endOfDay = fromZonedTime(`${date}T23:59:59`, timezone)

  let query = supabase
    .from('bookings')
    .select('start_time_utc, end_time_utc')
    .eq('merchant_id', merchant_id)
    .neq('status', 'cancelled')
    .gte('start_time_utc', startOfDay.toISOString())
    .lte('start_time_utc', endOfDay.toISOString())

  if (staff_id) query = query.eq('staff_id', staff_id)

  const { data: bookings } = await query

  const bookedTimes = (bookings || []).map(b =>
    formatInTimeZone(new Date(b.start_time_utc), timezone, 'HH:mm')
  )

  return NextResponse.json({ booked_times: bookedTimes })
}
```

---

## 📄 components/booking/QRISCheckout.tsx — THE KEY COMPONENT

```typescript
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle, Clock, RefreshCw, ExternalLink, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

interface Props {
  bookingId: string
  merchantSlug: string
  amountIdr: number
  serviceName: string
  businessName: string
  localDate: string
  localTime: string
  onPaid: () => void
  onCancel: () => void
}

type CheckoutState = 'loading' | 'qris' | 'paid' | 'expired' | 'error'

interface PaymentData {
  qr_string: string | null
  qr_image_url: string | null
  invoice_url: string
  expires_at: string
  available_banks: Array<{ bank_code: string; account_holder_name: string; transfer_amount: number; bank_account_number: string }>
}

export default function QRISCheckout({
  bookingId, merchantSlug, amountIdr, serviceName, businessName, localDate, localTime, onPaid, onCancel
}: Props) {
  const [state, setState] = useState<CheckoutState>('loading')
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(3600) // seconds
  const [showVA, setShowVA] = useState(false)
  const [copiedVA, setCopiedVA] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout>()
  const timerRef = useRef<NodeJS.Timeout>()

  // Create invoice and get QR
  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setState('error'); return }
      if (data.free) { onPaid(); return }
      setPaymentData(data)
      setState('qris')
      // Set countdown from expires_at
      if (data.expires_at) {
        const secs = Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000)
        setTimeLeft(Math.max(0, secs))
      }
    }
    init()
  }, [bookingId])

  // Countdown timer
  useEffect(() => {
    if (state !== 'qris') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setState('expired'); clearInterval(timerRef.current); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [state])

  // Poll for payment status every 3 seconds
  useEffect(() => {
    if (state !== 'qris') return
    const poll = async () => {
      const res = await fetch(`/api/payment-status?booking_id=${bookingId}`)
      const data = await res.json()
      if (data.is_paid) {
        setState('paid')
        clearInterval(pollRef.current)
        setTimeout(onPaid, 1500) // brief success flash before redirect
      } else if (data.is_expired) {
        setState('expired')
        clearInterval(pollRef.current)
      }
    }
    poll() // immediate first check
    pollRef.current = setInterval(poll, 3000)
    return () => clearInterval(pollRef.current)
  }, [state, bookingId, onPaid])

  const copyVA = (number: string) => {
    navigator.clipboard.writeText(number)
    setCopiedVA(number)
    setTimeout(() => setCopiedVA(null), 2000)
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ── PAID ──
  if (state === 'paid') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-teal-600" />
        </div>
        <h3 className="font-display text-xl text-stone-900 mb-1">Pembayaran Berhasil!</h3>
        <p className="text-sm text-stone-400">Mengalihkan ke halaman konfirmasi...</p>
      </div>
    )
  }

  // ── EXPIRED ──
  if (state === 'expired') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
          <Clock size={28} className="text-stone-400" />
        </div>
        <h3 className="font-display text-xl text-stone-800 mb-2">QR Code Kedaluwarsa</h3>
        <p className="text-sm text-stone-400 mb-6">Kode pembayaran sudah tidak berlaku.</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { setState('loading'); window.location.reload() }}
            className="flex items-center justify-center gap-2 w-full py-3 bg-teal-700 text-white rounded-xl text-sm font-medium hover:bg-teal-800"
          >
            <RefreshCw size={15} />
            Buat QR Baru
          </button>
          <button onClick={onCancel} className="text-sm text-stone-400 hover:text-stone-600 py-2">
            Batalkan Booking
          </button>
        </div>
      </div>
    )
  }

  // ── ERROR ──
  if (state === 'error') {
    return (
      <div className="text-center py-8">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <h3 className="font-medium text-stone-800 mb-2">Gagal membuat pembayaran</h3>
        <p className="text-sm text-stone-400 mb-4">Terjadi kesalahan. Coba lagi.</p>
        <button onClick={onCancel} className="text-sm text-teal-600 hover:underline">Kembali</button>
      </div>
    )
  }

  // ── LOADING ──
  if (state === 'loading' || !paymentData) {
    return (
      <div className="text-center py-10">
        <div className="w-48 h-48 bg-stone-100 rounded-2xl mx-auto mb-4 animate-pulse" />
        <p className="text-sm text-stone-400 animate-pulse-soft">Membuat kode pembayaran...</p>
      </div>
    )
  }

  // ── QRIS DISPLAY ──
  const isLowTime = timeLeft < 300 // last 5 mins

  return (
    <div>
      {/* Order summary */}
      <div className="bg-stone-50 rounded-xl p-4 mb-5 text-sm">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium text-stone-700">{serviceName}</div>
            <div className="text-xs text-stone-400 mt-0.5">{businessName} · {localDate} · {localTime}</div>
          </div>
          <div className="font-display text-lg text-stone-900 font-medium shrink-0 ml-4">
            {formatRupiah(amountIdr)}
          </div>
        </div>
      </div>

      {/* QRIS Code */}
      <div className="text-center mb-4">
        <p className="text-xs text-stone-400 mb-3 flex items-center justify-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isLowTime ? 'bg-red-400 animate-pulse' : 'bg-teal-400'}`} />
          {isLowTime ? (
            <span className="text-red-400 font-medium">Segera bayar! Berlaku {formatTime(timeLeft)}</span>
          ) : (
            <span>Berlaku selama {formatTime(timeLeft)}</span>
          )}
        </p>

        <div className="inline-block p-3 bg-white border-2 border-stone-200 rounded-2xl shadow-sm">
          {paymentData.qr_string ? (
            <QRCodeSVG
              value={paymentData.qr_string}
              size={200}
              level="M"
              includeMargin={false}
              className="rounded-lg"
            />
          ) : (
            // Fallback: show QR image from Xendit if qr_string unavailable
            paymentData.qr_image_url ? (
              <img src={paymentData.qr_image_url} alt="QRIS Code" className="w-48 h-48 rounded-lg" />
            ) : null
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="h-px w-12 bg-stone-200" />
          <span className="text-xs text-stone-400 font-medium">QRIS</span>
          <div className="h-px w-12 bg-stone-200" />
        </div>
        <p className="text-xs text-stone-400 mt-2">
          Scan dengan aplikasi mobile banking atau e-wallet manapun
        </p>
      </div>

      {/* VA Alternative */}
      {paymentData.available_banks && paymentData.available_banks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowVA(!showVA)}
            className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <span className="font-medium">Bayar via Transfer Bank</span>
            {showVA ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showVA && (
            <div className="mt-2 space-y-2">
              {paymentData.available_banks.map(bank => (
                <div key={bank.bank_code} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-stone-200">
                  <div>
                    <div className="text-xs font-semibold text-stone-700">{bank.bank_code}</div>
                    <div className="text-sm font-mono text-stone-800 mt-0.5 tracking-wide">{bank.bank_account_number}</div>
                    <div className="text-xs text-stone-400 mt-0.5">a.n. {bank.account_holder_name}</div>
                  </div>
                  <button
                    onClick={() => copyVA(bank.bank_account_number)}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      copiedVA === bank.bank_account_number
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {copiedVA === bank.bank_account_number ? 'Disalin!' : 'Salin'}
                  </button>
                </div>
              ))}
              <p className="text-xs text-stone-400 text-center pt-1">
                Transfer tepat {formatRupiah(amountIdr)} — berbeda nominal tidak diproses
              </p>
            </div>
          )}
        </div>
      )}

      {/* Fallback: open Xendit page */}
      <a
        href={paymentData.invoice_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 text-xs text-stone-400 hover:text-teal-600 transition-colors w-full py-2"
      >
        <ExternalLink size={12} />
        Buka halaman pembayaran lengkap
      </a>

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="mt-2 w-full text-sm text-stone-300 hover:text-stone-500 py-2 transition-colors"
      >
        Batalkan booking ini
      </button>
    </div>
  )
}
```

---

## 📄 app/book/[slug]/checkout/page.tsx

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import QRISCheckout from '@/components/booking/QRISCheckout'
import { formatLocalDate, formatLocalTime } from '@/lib/timezone'
import { ArrowLeft } from 'lucide-react'

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const bookingId = searchParams.get('booking_id')
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookingId) { router.push(`/book/${params.slug}`); return }

    const supabase = createClient()
    supabase
      .from('bookings')
      .select('*, services(name), merchants(business_name, booking_color, timezone, slug)')
      .eq('id', bookingId)
      .single()
      .then(({ data }) => {
        if (!data || data.payment_status === 'paid') {
          router.push(`/book/${params.slug}/success?booking_id=${bookingId}`)
          return
        }
        setBooking(data)
        setLoading(false)
      })
  }, [bookingId, params.slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-sm text-stone-400 animate-pulse">Memuat...</div>
      </div>
    )
  }

  if (!booking) return null

  const color = booking.merchants?.booking_color || '#0f766e'
  const timezone = booking.merchants?.timezone || 'Asia/Jakarta'

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div style={{ backgroundColor: color }} className="px-5 py-6 text-white">
        <div className="max-w-sm mx-auto flex items-center gap-3">
          <button onClick={() => router.push(`/book/${params.slug}`)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-xs opacity-70">Pembayaran</div>
            <div className="font-display text-lg">{booking.merchants?.business_name}</div>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 py-6">
        <QRISCheckout
          bookingId={bookingId!}
          merchantSlug={params.slug}
          amountIdr={booking.amount_idr}
          serviceName={booking.services?.name}
          businessName={booking.merchants?.business_name}
          localDate={formatLocalDate(booking.start_time_utc, timezone)}
          localTime={formatLocalTime(booking.start_time_utc, timezone)}
          onPaid={() => router.push(`/book/${params.slug}/success?booking_id=${bookingId}`)}
          onCancel={async () => {
            // Cancel the booking
            const supabase = createClient()
            await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
            router.push(`/book/${params.slug}`)
          }}
        />
      </div>

      <div className="text-center py-6">
        <a href="/" className="text-xs text-stone-300 hover:text-stone-500">Powered by Njadwal</a>
      </div>
    </div>
  )
}
```

---

## 📄 components/booking/CustomerForm.tsx — Updated (no WA mention)

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatRupiah } from '@/lib/utils'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface Props {
  merchant: any
  service: any
  staff: any
  date: string
  time: string
  onBack: () => void
}

export default function CustomerForm({ merchant, service, staff, date, time, onBack }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: merchant.id,
        service_id: service.id,
        staff_id: staff?.id || null,
        date,
        time,
        customer_name: name,
        customer_phone: phone || null,
        customer_email: email || null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Gagal membuat booking')
      setLoading(false)
      return
    }

    if (data.is_free) {
      // Free service — confirm directly, go to success
      router.push(`/book/${merchant.slug}/success?booking_id=${data.booking_id}`)
      return
    }

    // Paid service — go to checkout page with QRIS
    router.push(`/book/${merchant.slug}/checkout?booking_id=${data.booking_id}`)
  }

  const parsedDate = new Date(`${date}T${time}`)
  const formattedDate = format(parsedDate, "EEEE, d MMMM yyyy", { locale: idLocale })

  return (
    <div>
      <button onClick={onBack} className="text-xs text-teal-600 hover:underline mb-4 block">← Kembali</button>

      {/* Summary card */}
      <div className="bg-stone-50 rounded-xl p-4 mb-5">
        <div className="text-sm font-medium text-stone-700 mb-1">{service.name}</div>
        <div className="text-xs text-stone-400 space-y-0.5">
          <div>📅 {formattedDate} · {time}</div>
          {staff && <div>👤 {staff.name}</div>}
          <div className="font-medium text-teal-600 text-sm mt-2">
            {service.price_idr === 0 ? 'Gratis' : formatRupiah(service.price_idr)}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">Nama Lengkap *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Budi Santoso" required />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">
            Nomor HP <span className="text-stone-300 font-normal">(opsional)</span>
          </label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="0812-3456-7890" />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">
            Email <span className="text-stone-300 font-normal">(opsional, untuk bukti booking)</span>
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="budi@email.com" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-teal-700 text-white rounded-xl text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-60">
          {loading ? 'Memproses...' : (
            <>
              {service.price_idr === 0 ? 'Konfirmasi Booking' : 'Lanjut ke Pembayaran'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
```

---

## 📄 app/book/[slug]/success/page.tsx

```typescript
import { createClient } from '@/lib/supabase/server'
import { CheckCircle, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatLocalDate, formatLocalTime } from '@/lib/timezone'

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { booking_id?: string }
}) {
  const supabase = createClient()
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, services(name), merchants(business_name, booking_color, timezone)')
    .eq('id', searchParams.booking_id || '')
    .single()

  const color = booking?.merchants?.booking_color || '#0f766e'
  const timezone = booking?.merchants?.timezone || 'Asia/Jakarta'

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ backgroundColor: color + '15' }}>
          <CheckCircle size={32} style={{ color }} />
        </div>

        <h1 className="font-display text-2xl text-stone-900 mb-2">Booking Terkonfirmasi!</h1>
        <p className="text-sm text-stone-400 mb-8">Sampai bertemu di sana 👋</p>

        {booking && (
          <div className="bg-white rounded-2xl border border-stone-100 p-5 text-left mb-6">
            <div className="font-medium text-stone-800 mb-3">{booking.merchants?.business_name}</div>
            <div className="space-y-2 text-sm text-stone-500">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-stone-300 shrink-0" />
                {formatLocalDate(booking.start_time_utc, timezone)}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-stone-300 shrink-0" />
                {formatLocalTime(booking.start_time_utc, timezone)} WIB
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-xs shrink-0">✓</span>
                {booking.services?.name}
              </div>
            </div>
          </div>
        )}

        <Link
          href={`/book/${params.slug}`}
          className="text-sm text-teal-600 hover:underline font-medium"
        >
          Buat Booking Lagi
        </Link>
      </div>

      <div className="mt-12 text-xs text-stone-300">
        Powered by <Link href="/" className="hover:text-stone-500 transition-colors">Njadwal</Link>
      </div>
    </div>
  )
}
```

---

## 📄 components/landing/Pricing.tsx — Updated (no WA mention)

```typescript
import Link from 'next/link'
import { Check } from 'lucide-react'

const plans = [
  {
    id: 'solo',
    name: 'Solo',
    price: '99.000',
    desc: 'Untuk freelancer & bisnis 1 orang',
    features: [
      '1 kalender',
      'QRIS & transfer bank',
      'Booking tak terbatas',
      'Link booking publik',
      'Dashboard dasar',
    ],
    cta: 'Mulai Solo',
    highlighted: false,
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '199.000',
    desc: 'Untuk studio & tim',
    features: [
      'Kalender multi-staff (s/d 10)',
      'QRIS & transfer bank',
      'Booking tak terbatas',
      'Link booking publik',
      'Manajemen tim & jadwal',
      'Google Calendar sync',
      'Laporan booking',
    ],
    cta: 'Mulai Studio',
    highlighted: true,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-5">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-medium text-teal-600 uppercase tracking-widest">Harga</span>
          <h2 className="font-display text-3xl md:text-4xl text-stone-900 mt-3 mb-4">
            Harga yang masuk akal
          </h2>
          <p className="text-stone-500">Tidak ada biaya tersembunyi. Bayar bulanan, batalkan kapan saja.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {plans.map(plan => (
            <div key={plan.id} className={`p-8 rounded-2xl border-2 relative ${
              plan.highlighted ? 'border-teal-700 bg-teal-700 text-white' : 'border-stone-200 bg-white'
            }`}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">
                  Paling Populer
                </div>
              )}
              <div className="mb-6">
                <div className={`text-sm font-medium mb-1 ${plan.highlighted ? 'text-teal-200' : 'text-stone-500'}`}>
                  Paket {plan.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-sm ${plan.highlighted ? 'text-teal-200' : 'text-stone-500'}`}>Rp</span>
                  <span className="font-display text-4xl font-medium">{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-teal-200' : 'text-stone-400'}`}>/bulan</span>
                </div>
                <div className={`text-sm mt-1 ${plan.highlighted ? 'text-teal-200' : 'text-stone-400'}`}>{plan.desc}</div>
              </div>

              <ul className="space-y-2.5 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check size={15} className={plan.highlighted ? 'text-teal-300' : 'text-teal-600'} />
                    <span className={`text-sm ${plan.highlighted ? 'text-teal-100' : 'text-stone-600'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register" className={`block text-center text-sm font-medium py-3 rounded-xl transition-all ${
                plan.highlighted ? 'bg-white text-teal-700 hover:bg-teal-50' : 'bg-teal-700 text-white hover:bg-teal-800'
              }`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

## 📄 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'api.xendit.co' },
    ],
  },
}

module.exports = nextConfig
```

---

## 📄 ecosystem.config.js (PM2)

```javascript
module.exports = {
  apps: [{
    name: 'njadwal',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/var/www/njadwal',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: { NODE_ENV: 'production', PORT: 3000 },
  }],
}
```

---

## 📄 .gitignore

```
.env.local
.env*.local
.next/
node_modules/
out/
*.log
.DS_Store
```
# ✅ NJADWAL v2 — Part 3: Build Checklist

> Cleaner stack — no WhatsApp, no Facebook, QRIS inline on page.

---

## THE ORDER

```
Supabase → Xendit → Next.js (Antigravity) → VPS Deploy
```

No n8n dependency for core flow. Everything is Next.js API routes.

---

## 🗓️ WEEK 1: Foundation

### Day 1 — Supabase
- [ ] Create project (Singapore region)
- [ ] Enable Google SSO only (setup Google OAuth console)
- [ ] Run entire SQL schema from PART1
- [ ] Verify: create user → profile auto-created in `profiles` table
- [ ] Save all keys to `.env.local`

### Day 2 — Next.js Init
```bash
npx create-next-app@latest njadwal --typescript --tailwind --app --no-src-dir
cd njadwal
npm install @supabase/supabase-js @supabase/ssr date-fns date-fns-tz \
  lucide-react react-hot-toast clsx tailwind-merge xendit-node qrcode.react
npm install --save-dev @types/qrcode.react
```
- [ ] Replace `tailwind.config.ts` from PART2
- [ ] Replace `app/globals.css` from PART2
- [ ] Create all files from PART2 structure
- [ ] Create `.env.local`
- [ ] Run `npm run dev` → landing page loads at localhost:3000

### Day 3 — Auth
- [ ] Implement `login/page.tsx` (Google + email, NO Facebook button)
- [ ] Implement `register/page.tsx`
- [ ] Implement `auth/callback/route.ts`
- [ ] Implement `middleware.ts`
- [ ] Test: Google SSO flows through → lands on /dashboard
- [ ] Test: Email signup → verify email → login works
- [ ] Test: `/dashboard` without login → redirects to `/login`

### Day 4 — Merchant Settings + Subscription
- [ ] Implement `settings/page.tsx`
- [ ] After merchant creation, auto-create subscription:
```typescript
// Add this after merchant insert in settings save handler
await supabase.from('subscriptions').insert({
  merchant_id: newMerchantId,
  plan_id: 'solo',
  status: 'active',
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
})
```
- [ ] Test: Create merchant → appears in Supabase
- [ ] Test: Slug is unique (try duplicate → should fail)

### Day 5 — Services + Schedule
- [ ] Implement `services/page.tsx` + add/edit form
- [ ] Implement `schedule/page.tsx`
- [ ] Test: Add service "Potong Rambut — 60 min — Rp 75.000"
- [ ] Test: Set schedule Mon–Sat 09:00–17:00

---

## 🗓️ WEEK 2: Booking Flow

### Day 6 — Public Booking Page
- [ ] Implement `app/book/[slug]/page.tsx`
- [ ] Implement `components/booking/ServicePicker.tsx`
- [ ] Implement `components/booking/DateTimePicker.tsx`
- [ ] Implement `api/bookings/availability/route.ts`
- [ ] Test at `localhost:3000/book/your-slug`
  - [ ] Services load
  - [ ] Calendar shows correct days
  - [ ] Time slots generate correctly
  - [ ] Booked slots are excluded

### Day 7 — Customer Form + Booking Creation
- [ ] Implement `components/booking/CustomerForm.tsx`
- [ ] Implement `api/bookings/route.ts`
- [ ] Test: Fill customer form → booking created in Supabase with `pending_payment`
- [ ] Test: Try booking same slot twice → second gets "Slot sudah terpesan" error
- [ ] Test: Free service (price=0) → goes straight to success page

### Day 8 — Xendit QRIS Integration
- [ ] Create Xendit account + start KYB
- [ ] Get test API key from Xendit sandbox
- [ ] Implement `api/checkout/route.ts`
- [ ] Implement `api/payment-status/route.ts` (polling)
- [ ] Implement `components/booking/QRISCheckout.tsx`
- [ ] Implement `app/book/[slug]/checkout/page.tsx`
- [ ] Test with Xendit sandbox:
  - [ ] Booking created → redirects to checkout page
  - [ ] QR code renders on page
  - [ ] Countdown timer works
  - [ ] VA alternatives show and are copyable

### Day 9 — Payment Webhook + Confirmation
- [ ] Implement `api/webhooks/xendit/route.ts`
- [ ] Test with Xendit webhook simulator:
  - [ ] Simulate PAID → booking status updates to `confirmed`
  - [ ] Page polling detects paid → redirects to success
- [ ] Implement `app/book/[slug]/success/page.tsx`
- [ ] Full flow test: service → staff → date/time → customer form → QRIS → pay → success

---

## 🗓️ WEEK 3: Dashboard + Deploy

### Day 10 — Dashboard
- [ ] Implement `components/dashboard/Sidebar.tsx`
- [ ] Implement `app/(dashboard)/layout.tsx`
- [ ] Implement `dashboard/page.tsx` (stats)
- [ ] Implement `bookings/page.tsx`
- [ ] Implement `staff/page.tsx`
- [ ] Test: Booking from Day 9 appears in dashboard
- [ ] Test: Status shows "Terkonfirmasi"

### Day 11 — Xendit Production + VPS
- [ ] Complete Xendit KYB (if not done)
- [ ] Switch to production API key in `.env.local`
- [ ] Apply for QRIS in Xendit dashboard (1–3 days approval)
- [ ] Set up VPS: Node.js 20 + PM2
- [ ] Configure Nginx + SSL (certbot)
- [ ] Push code to GitHub
- [ ] Clone + deploy on VPS

### Day 12 — Webhooks + DNS
- [ ] Point DNS: `njadwal.autoable.cloud → VPS IP`
- [ ] Configure Xendit webhook to: `https://njadwal.autoable.cloud/api/webhooks/xendit`
- [ ] Test production webhook with Xendit simulator
- [ ] Full end-to-end test on production

### Day 13–14 — Bug Fix + Polish
- [ ] Test on mobile (Android Chrome, iOS Safari)
- [ ] Test concurrent bookings (2 tabs, same slot)
- [ ] Test expired QRIS flow (wait for timer, try "Buat QR Baru")
- [ ] Check dark mode / different screen sizes
- [ ] Create demo merchant at `/book/demo`

---

## 🧪 KEY TEST COMMANDS

```bash
# Test booking API
curl -X POST localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_id": "your-merchant-uuid",
    "service_id": "your-service-uuid",
    "date": "2024-12-20",
    "time": "10:00",
    "customer_name": "Test User",
    "customer_email": "test@test.com"
  }'

# Test payment status
curl "localhost:3000/api/payment-status?booking_id=your-booking-uuid"

# Test Xendit webhook (simulate PAID)
curl -X POST localhost:3000/api/webhooks/xendit \
  -H "Content-Type: application/json" \
  -H "x-callback-token: your_xendit_callback_token" \
  -d '{
    "status": "PAID",
    "external_id": "NJADWAL-your-booking-uuid",
    "payment_method": "QRIS"
  }'

# Check booking updated in Supabase
# Go to Supabase → Table Editor → bookings → filter by id
```

---

## 🔑 CRITICAL NOTES

### QRIS Approval
- Xendit QRIS needs separate approval (not instant)
- While waiting: test with VA payment methods (BCA, Mandiri, etc.) — these work immediately
- The `QRISCheckout` component handles missing `qr_string` gracefully by showing VA alternatives

### Xendit Sandbox vs Production
```bash
# Sandbox key format:
XENDIT_SECRET_KEY=xnd_development_xxxx

# Production key format:
XENDIT_SECRET_KEY=xnd_production_xxxx
```
Sandbox invoices go to: `https://checkout-staging.xendit.co/...`

### The Polling Pattern
```
User sees QRIS → polls /api/payment-status every 3s
Xendit fires webhook → Next.js updates Supabase
Next poll detects is_paid=true → redirect to success
```
This means webhook must be publicly accessible (not localhost) during testing.
Use **ngrok** for local webhook testing:
```bash
ngrok http 3000
# Then set Xendit webhook to: https://abc123.ngrok.io/api/webhooks/xendit
```

### Concurrency
The `book_slot()` Postgres function uses `pg_advisory_xact_lock` — if two users book the exact same slot simultaneously, one gets `SLOT_TAKEN`. No race conditions.

### Phone is Optional
Removed WA dependency means phone number is now optional on the booking form. Still collect it for merchant reference.

---

## 🗺️ POST-MVP ROADMAP

**Next features to add (in priority order):**
1. Email notifications via Resend.com (free tier, very simple setup)
2. Booking reschedule by merchant from dashboard
3. Google Calendar sync (OAuth already in schema)
4. Staff-specific availability overrides
5. Merchant analytics dashboard
6. Mobile PWA for merchants
