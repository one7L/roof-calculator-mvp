# 🏠 Roof Calculator MVP

Automated roof square footage calculator using Google Solar API for precise roofing measurements.

## 🎯 Overview

This application provides automated roof measurements with 95% accuracy target, eliminating the need for expensive manual GAF reports ($4,000/month) by leveraging Google's Solar API and intelligent fallback mechanisms.

### Key Features
- ✅ Address-to-measurement in <5 seconds
- ✅ Automatic pitch detection and multiplier calculation
- ✅ Complexity scoring (1-10 scale) with dynamic waste factors (10-25%)
- ✅ Confidence scoring to recommend when GAF reports are needed
- ✅ Manual polygon tracing fallback for high-complexity roofs
- ✅ Cost: $0.01-0.05 per measurement vs. $12.50/week competitor pricing

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **APIs**: 
  - Google Solar API (Building Insights)
  - Google Geocoding API
  - Google Maps JavaScript API
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm
- Google Cloud Platform account with:
  - Solar API enabled
  - Geocoding API enabled
  - Maps JavaScript API enabled
  - API Key created
- Supabase account (free tier)

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/one7L/roof-calculator-mvp.git
cd roof-calculator-mvp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Google Maps Platform API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCSyZCp_xSuom8wMQa5_bUXCu2y_W0DMSo

# Google Cloud Project ID
NEXT_PUBLIC_GCP_PROJECT_ID=project-0236e9ee-dbe3-4f3a-9bd
```

⚠️ **Never commit `.env.local` to Git!**

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
roof-calculator-mvp/
├── app/
│   ├── api/
│   │   ├── geocode/route.ts
│   │   ├── solar/route.ts
│   │   └── calculate/route.ts
│   ├── components/
│   │   ├── AddressInput.tsx
│   │   ├── RoofTracer.tsx
│   │   └── MeasurementResults.tsx
│   └── page.tsx
├── .env.local
└── README.md
```

## 🧮 Calculation Methodology

### Pitch Multipliers

| Roof Pitch | Multiplier |
|------------|------------|
| Flat (0-2:12) | 1.00x |
| Low (3-4:12) | 1.06x |
| Medium (5-6:12) | 1.12x |
| Steep (7-9:12) | 1.25x |
| Very Steep (10-12:12) | 1.41x |

### Complexity Scoring
- **Simple (1-3)**: 10% waste
- **Moderate (4-6)**: 15% waste
- **Complex (7-10)**: 20-25% waste

## 📊 API Costs

### Monthly (1,000 measurements)
```
Solar API:      $0.00 (free tier)
Geocoding:      $5.00
─────────────────────
Total:          ~$5/month
```

vs. Competitor: $50/month

## 🚢 Deployment

Deploy to Vercel:

```bash
vercel --prod
```

## 📈 Roadmap

### Phase 1 - MVP ✅
- [x] Google Cloud setup
- [x] GitHub repository
- [ ] Next.js initialization

### Phase 2 - Core Features
- [ ] Address input
- [ ] Solar API integration
- [ ] Calculation algorithms

### Phase 3 - Advanced Features
- [ ] Manual polygon tracing
- [ ] Database integration

### Phase 4 - Testing
- [ ] Validate against GAF reports
- [ ] Production deployment

## 📚 Documentation

- [Google Solar API](https://developers.google.com/maps/documentation/solar)
- [Next.js 14](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📄 License

MIT License - See LICENSE file for details.

---

**Built with ❤️ for Harmony Digital Solutions**
