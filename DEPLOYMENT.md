# Deployment Guide - Detached from Lovable

This project can be deployed to various platforms. Here are the recommended options:

## Option 1: Vercel (Recommended - Easiest)

### Setup:
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel` (follow prompts)
3. Or connect GitHub repo at [vercel.com](https://vercel.com)

### Automatic Deployment:
- Push to `main` branch → Auto-deploys
- Preview deployments for PRs
- Free tier includes custom domains

### Build Settings:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

---

## Option 2: Netlify

### Setup:
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy` (follow prompts)
3. Or connect GitHub repo at [netlify.com](https://netlify.com)

### Build Settings:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Base directory**: (root)

---

## Option 3: Cloudflare Pages

### Setup:
1. Connect GitHub repo at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select this repository
3. Configure:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: (root)

---

## Option 4: GitHub Pages

### Setup:
1. Install gh-pages: `npm install --save-dev gh-pages`
2. Add to package.json scripts:
   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```
3. Run: `npm run deploy`

---

## Important: Update Canonical URL

Before deploying, update `src/lib/canonical.ts` with your new domain:

```typescript
export const CANONICAL_SITE_URL = "https://your-new-domain.com";
```

---

## Environment Variables

Make sure to set these in your deployment platform:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## Remove Lovable Dependencies (Optional)

If you want to fully detach, you can remove:
- `lovable-tagger` from `package.json` devDependencies
- `componentTagger()` from `vite.config.ts`

But these won't affect deployment if left in.

