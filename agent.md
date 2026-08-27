# AGENT INSTRUCTIONS: GNH PRASADAM & EXPENSE APP

## Project Context
- Multi-device PWA (Mobile + Desktop) for ~30 devotees.
- Free-tier deployment: Vite + React + Tailwind CSS + Shadcn UI + Supabase + Vercel.

## Core Assets
- Main Logo is located at `/public/logo.png`. Always render this logo in the navigation header, login screen, and PWA manifest.

## Non-Negotiable Business Rules
1. Rates: Breakfast = ₹40, Lunch = ₹80, Dinner = ₹40.
2. Net Calculation: (Prasadam Cost) - (Approved Regular Expenses) + (Carried Forward) - (Settled Amount).
3. Cutoff Rule: 8:00 PM on the N-2 day of the month (2 days before month end).
   - User inputs freeze on cutoff.
   - Missing counts auto-fill with the devotee's maximum entered count per meal slot.
   - Admin 6-digit PIN overrides all locks.
4. Image Compression: All receipts MUST be compressed to <200 KB on the client using `browser-image-compression` before uploading to Supabase Storage.
5. URL State: Keep phone and active tab synced to URL query params (`?phone=...&tab=...`).