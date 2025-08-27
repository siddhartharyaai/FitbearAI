# Fitbear AI - M0 Release

Indian-first health/fitness/nutrition assistant (Web PWA, Free-first stack) targeting Indian consumers with mixed diets and intermittent connectivity.

## Architecture - M0

**Authentication**: Supabase Auth (email/password)
**Data Storage**: MongoDB (all user data, profiles, targets, logs)
**Future**: M1 will migrate to Supabase DB while maintaining Supabase Auth

### Core Features
1. **Coach C (chat + voice)**: Empathetic, science-first coaching with Deepgram TTS/STT
2. **Menu Scanner**: Upload menu photo → OCR via Gemini Vision → nutrition recommendations
3. **Meal Photo Analyzer**: Image analysis → food detection → macro computation
4. **BPS Onboarding**: Demographics, activity, dietary preferences, targets calculation
5. **Food Logging**: Manual/automated meal tracking with history
6. **Daily Targets**: TDEE-based calorie and macro recommendations

## Quick Start

```bash
# Install dependencies
yarn install

# Set environment variables
cp .env.example .env
# Add your API keys: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

# Create MongoDB indexes
npm run db:indexes

# Start development
yarn dev
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

## Technology Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, MongoDB
- **Auth**: Supabase Auth (email/password)
- **AI**: Google Gemini (chat, vision, OCR)
- **Voice**: Deepgram (STT/TTS)
- **Analytics**: PostHog
- **Deployment**: Kubernetes, Docker

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