# EdgeLink - Developer-First URL Shortener

A fast, affordable URL shortener built on Cloudflare's edge network with enterprise-grade features.

## 🚀 Features

### Week 1 MVP (✅ Completed)

**Core Functionality:**
- ✅ Anonymous link creation (30-day expiry, no signup required)
- ✅ Custom slug support (5-20 characters)
- ✅ Ultra-fast redirects (<50ms target)
- ✅ Collision detection with automatic retry
- ✅ JWT-based authentication (HS256, 24-hour expiry)
- ✅ Rate limiting (1K/day free, 10K/day pro)
- ✅ User registration and login
- ✅ Link management dashboard
- ✅ Click tracking with Analytics Engine
- ✅ Device fingerprinting for security

**Advanced Features (Pro tier ready):**
- ✅ Device-based routing (mobile/desktop/tablet)
- ✅ Geographic routing (by country)
- ✅ Referrer-based routing
- ✅ A/B testing support
- ✅ UTM parameter auto-append
- ✅ Password-protected links
- ✅ Link expiration

### Week 2 Features ✅
- [x] Analytics dashboard with comprehensive charts
- [x] Time series line charts (clicks over time)
- [x] Device breakdown pie charts
- [x] Browser distribution bar charts
- [x] Geographic distribution (country-based)
- [x] Operating system analytics
- [x] Top referrers tracking
- [x] Time range filtering (7d/30d)

### Week 3 Features ✅
- [x] Custom domain management with DNS verification
- [x] SSL provisioning documentation
- [x] API key generation and management
- [x] Domain limit enforcement (Free: 1, Pro: 5)
- [x] API key limit enforcement (Max: 5 per user)
- [x] URL safety checking (abuse prevention)
- [x] Email verification structure
- [x] Rate limiting for sensitive operations
- [x] Input sanitization utilities

### Coming Soon (Weeks 4-12)
- [ ] MapBox geographic heatmap integration
- [ ] QR code generation (Pro)
- [ ] Webhooks
- [ ] Advanced analytics export (CSV/JSON)
- [ ] Browser extension
- [ ] Email service integration (Resend/SendGrid)
- [ ] Google Safe Browsing API integration

## 📁 Project Structure

```
edgelink/
├── backend/                 # Cloudflare Workers
│   ├── src/
│   │   ├── index.ts        # Main worker entry point
│   │   ├── auth/           # JWT authentication
│   │   ├── handlers/       # API route handlers
│   │   ├── middleware/     # Auth & rate limiting
│   │   ├── types/          # TypeScript interfaces
│   │   └── utils/          # Helper functions
│   ├── schema.sql          # D1 database schema
│   ├── wrangler.toml       # Cloudflare config
│   └── package.json
│
├── frontend/               # Next.js 14 Dashboard
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   └── lib/           # API client & utilities
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── shared/                 # Shared types (future)
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Cloudflare Workers (Edge Compute)
- **Database**: D1 (SQLite), Workers KV (Fast Redirects)
- **Analytics**: Analytics Engine (10M events/day free)
- **Storage**: R2 (File exports/imports)
- **Auth**: JWT with Web Crypto API (HS256)
- **Rate Limiting**: KV-based (simple, effective)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Deployment**: Cloudflare Pages
- **State**: localStorage (JWT tokens)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create D1 database
wrangler d1 create edgelink
# Copy database_id to wrangler.toml

# Initialize database schema
wrangler d1 execute edgelink --file=./schema.sql

# Create KV namespace
wrangler kv:namespace create "LINKS_KV"
wrangler kv:namespace create "LINKS_KV" --preview
# Copy IDs to wrangler.toml

# Create R2 bucket
wrangler r2 bucket create edgelink-storage

# Set JWT secret
wrangler secret put JWT_SECRET
# Enter a strong random string (32+ characters)
# Generate with: openssl rand -base64 32

# Start development server
npm run dev
# Server runs on http://localhost:8787
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL

# Start development server
npm run dev
# Dashboard runs on http://localhost:3000
```

### 3. Deploy to Production

**Backend (Workers):**
```bash
cd backend
npm run deploy
# Your worker is live at: https://your-worker.workers.dev
```

**Frontend (Pages):**
```bash
cd frontend
npm run pages:build
npm run pages:deploy
# Or connect to GitHub for automatic deployments
```

## 📊 Architecture

### Request Flow

#### URL Shortening (Anonymous)
```
User → POST /api/shorten
  → Check rate limit (KV)
  → Generate slug (collision detection)
  → Store in KV (fast path)
  → Store in D1 (management)
  → Return short URL
```

#### URL Redirect
```
User → GET /{slug}
  → Fetch from KV (< 10ms)
  → Check expiration, password
  → Apply routing rules (device, geo, referrer)
  → Write analytics event (async)
  → Increment click count (async)
  → 301 Redirect to destination
```

#### Authentication
```
User → POST /auth/login
  → Verify password (PBKDF2)
  → Generate JWT (HS256, 24h expiry)
  → Generate refresh token (30d)
  → Store refresh token in D1
  → Return tokens + user info
```

### Data Storage

**KV (Fast Path):**
- Link redirects
- Rate limit counters
- Session data

**D1 (Metadata):**
- Users & authentication
- Link metadata
- Usage tracking
- Custom domains
- Refresh tokens

**Analytics Engine:**
- Click events (real-time)
- Device, browser, OS stats
- Geographic data
- Referrer tracking

## 🔐 Security Features

- ✅ JWT-based authentication (HS256)
- ✅ Device fingerprinting (anti-theft)
- ✅ 24-hour token expiration
- ✅ Refresh token rotation
- ✅ Password hashing (PBKDF2, 100K iterations)
- ✅ Rate limiting per user tier
- ✅ HTTPS-only (Cloudflare enforced)
- ✅ GDPR compliant (no PII tracking)
- ✅ Input validation and sanitization

## 📈 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Redirect Latency (p95) | <50ms | ✅ Implemented |
| Link Creation Time | <200ms | ✅ Implemented |
| JWT Validation | <5ms | ✅ Implemented |
| Uptime | 99.9% | ✅ Cloudflare SLA |
| Dashboard Load | <1.5s | ✅ Optimized |

## 💰 Pricing Model

### Free Forever
- 500 links/month
- 50K clicks tracked/month
- 1 custom domain
- 1K API calls/day
- 30 days analytics retention
- Unlimited link editing

### Pro ($9/month)
- 5,000 links/month
- 500K clicks tracked/month
- 5 custom domains
- 10K API calls/day
- 1 year analytics retention
- QR codes
- Device routing
- Geographic routing
- A/B testing
- Webhooks
- Password protection
- Advanced export

## 🧪 Testing

```bash
# Test anonymous link creation
curl -X POST http://localhost:8787/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Test redirect
curl -I http://localhost:8787/abc123

# Test signup
curl -X POST http://localhost:8787/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test1234"}'

# Test authenticated link creation
curl -X POST http://localhost:8787/api/shorten \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"url": "https://example.com", "custom_slug": "mylink"}'
```

## 📝 API Documentation

### Authentication

**POST /auth/signup**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "Optional Name"
}
```

**POST /auth/login**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### Links

**POST /api/shorten** (Anonymous or Authenticated)
```json
{
  "url": "https://example.com/very/long/url",
  "custom_slug": "mylink",
  "expires_at": "2025-12-31T23:59:59Z",
  "utm_template": "utm_source=twitter&utm_medium=social"
}
```

**GET /{slug}** - Redirect to destination

**GET /api/links** - Get user's links (authenticated)

**PUT /api/links/{slug}** - Update link (authenticated)

**DELETE /api/links/{slug}** - Delete link (authenticated)

**GET /api/stats/{slug}** - Get analytics (authenticated)

## 🎯 Roadmap

### Week 1 ✅ Completed
- Core redirect engine
- JWT authentication
- Rate limiting
- Basic dashboard

### Week 2 ✅ Completed
- Analytics dashboard with charts
- Real-time click tracking queries
- Time series visualizations
- Device/browser/OS breakdowns
- Geographic distribution
- Top referrers tracking

### Week 3 ✅ Completed
- Custom domain management
- SSL provisioning
- Domain verification
- API key generation
- Security utilities

### Week 4 (MVP Launch)
- QR code generation
- Link expiration UI
- Performance optimization
- ProductHunt launch

### Weeks 5-12
- Advanced routing features
- A/B testing UI
- Webhooks
- Browser extension
- Zapier integration
- Team collaboration

## 📊 Infrastructure Costs

At 5,000 users (150 Pro + 4,850 Free):
- **Cloudflare Workers**: ~$184/month
- **Revenue**: $900/month (150 × $6)
- **Gross Margin**: 79%

## 🤝 Contributing

This is currently a private project. Contributions will be opened after MVP launch.

## 📄 License

Proprietary - All rights reserved

## 🔗 Links

- **Frontend**: (To be deployed)
- **Backend API**: (To be deployed)
- **Documentation**: Coming soon
- **Status Page**: Coming soon

## 👨‍💻 Development Team

Built with ❤️ by the EdgeLink team

---

**Status**: Week 3 Complete ✅
**Next Milestone**: Week 4 Polish + Launch
**Target Launch**: Week 4 (ProductHunt)
