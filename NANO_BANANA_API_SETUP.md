# Nano Banana Pro API Setup Guide

## Overview
Nano Banana Pro API provides faster and lower-cost image generation compared to the current Lovable gateway. Pricing: $0.105 per image (1K/2K) or $0.18 per image (4K).

## Setup Steps

### 1. Get API Key
1. Sign up at [Nano Banana Pro](https://nanobananaproapi.org)
2. Generate an API key from your dashboard
3. Add it to Supabase environment variables

### 2. Add to Supabase Environment Variables
In Supabase Dashboard → Project Settings → Edge Functions → Secrets:
- Add: `NANO_BANANA_API_KEY` = `your-api-key-here`

### 3. API Endpoint (Update when confirmed)
The current implementation uses a placeholder endpoint. Once you have the API key, check the official documentation at [nanobananaproapi.org/docs](https://nanobananaproapi.org/docs) to confirm:
- Exact endpoint URL
- Request format
- Response format
- Authentication method

### 4. Update the Implementation
The code in `supabase/functions/generate-image/index.ts` has been prepared with:
- Nano Banana Pro API as primary option
- Lovable API as fallback
- Proper error handling and timeouts

You'll need to update the endpoint URL and request/response parsing based on the actual API documentation.

## Current Implementation Status
✅ Code structure ready for Nano Banana Pro
✅ Fallback to Lovable API if Nano Banana fails
⏳ Waiting for API key and endpoint confirmation

## Testing
Once the API key is added and endpoint is confirmed:
1. Test with a simple prompt
2. Check Supabase Edge Function logs
3. Verify image URLs are returned correctly
4. Monitor costs in Nano Banana Pro dashboard

