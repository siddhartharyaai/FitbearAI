# Fitbear AI - M0 Release

Indian-first health/fitness/nutrition assistant (Web PWA, Free-first stack) targeting Indian consumers with mixed diets and intermittent connectivity.

## Architecture - M0

**Authentication**: Supabase Auth (email/password)
**Data Storage**: MongoDB (all user data, profiles, targets, logs)
**Hosting**: Netlify (Next.js App Router + Serverless Functions)
**Future**: M1 will migrate to Supabase DB while maintaining Supabase Auth

### Core Features
1. **Coach C (chat + voice)**: Empathetic, science-first coaching with Deepgram TTS/STT
2. **Menu Scanner**: Upload menu photo → OCR via Gemini Vision → nutrition recommendations
3. **Meal Photo Analyzer**: Image analysis → food detection → macro computation
4. **BPS Onboarding**: Demographics, activity, dietary preferences, targets calculation
5. **Food Logging**: Manual/automated meal tracking with history
6. **Daily Targets**: TDEE-based calorie and macro recommendations

## Quick Start - Local Development

```bash
# Install dependencies
yarn install

# Set environment variables
cp .env.example .env
# Add your API keys: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, MONGODB_URI

# Create MongoDB indexes
npm run db:indexes

# Start development
yarn dev
```

## Netlify Deployment

### 1. Environment Variables (Netlify Site Settings)

```
DB_PROVIDER=mongo
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
MONGODB_DB=fitbear

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

GEMINI_API_KEY=your-gemini-key
DEEPGRAM_API_KEY=your-deepgram-key

NEXT_PUBLIC_POSTHOG_API_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

NODE_VERSION=20
```

### 2. MongoDB Atlas Setup

In **MongoDB Atlas → Network Access**:
- Add **0.0.0.0/0 (Allow access from anywhere)** for Netlify functions
- Ensure database user has read/write permissions

### 3. Deploy Steps

```bash
# Connect to Netlify (one-time setup)
npm install -g netlify-cli
netlify login
netlify init

# Deploy
netlify deploy --prod
```

Or deploy via **GitHub integration** in Netlify dashboard.

### 4. Post-Deploy Verification

Test these endpoints on your Netlify URL:

```bash
# Health check
curl https://your-app.netlify.app/api/health/app

# Should return: {"ok": true, "db": "ok", "runtime": "nodejs"}
```

## Database Setup

M0 uses MongoDB for data storage with Supabase for authentication only.

**Current**: `DB_PROVIDER=mongo`
**Future M1**: `DB_PROVIDER=supabase` (after migration)

### MongoDB Collections
- `profiles` - User health profiles and preferences
- `targets` - Daily calorie/macro targets by user
- `food_logs` - Meal logging history
- `food_items` - Master food database
- `ocr_scans` - Menu scan results
- `photo_analyses` - Meal photo analysis results

## API Endpoints

All endpoints require Supabase authentication and are owner-scoped.

### Core APIs
- `GET /api/me` - User profile
- `PUT /api/me/profile` - Update profile
- `GET /api/me/targets` - Daily targets
- `POST /api/tools/tdee` - Calculate TDEE
- `POST /api/logs` - Log food entry
- `GET /api/logs` - Get food history
- `POST /api/coach/ask` - Chat with Coach C
- `POST /api/menu/scan` - Scan menu photo
- `POST /api/food/analyze` - Analyze meal photo
- `GET /api/export` - Export user data
- `GET /api/health/app` - Health check

## Technology Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, MongoDB
- **Auth**: Supabase Auth (email/password)
- **AI**: Google Gemini (chat, vision, OCR)
- **Voice**: Deepgram (STT/TTS)
- **Analytics**: PostHog
- **Deployment**: Netlify (Serverless Functions + CDN)

## Security

- All API routes require valid Supabase session
- Owner-only data access (filtered by userId)
- Input validation and sanitization
- Rate limiting on AI endpoints
- Secure API key management

## Development

```bash
# Run tests
npm test

# Check database indexes
npm run db:indexes

# Export user data (requires auth)
curl -H "Authorization: Bearer <token>" /api/export
```

See `/docs/IMPLEMENTATION_SUMMARY.md` for detailed technical documentation.