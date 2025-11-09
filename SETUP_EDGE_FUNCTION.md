# Fixing FAL_KEY Security Warning

## Problem
The FAL_KEY was being exposed in the browser bundle, which is a security risk. The fal.ai client was warning about this.

## Solution
Image generation has been moved to a Supabase Edge Function to keep the API key secure on the server side.

## Setup Steps

### 1. Deploy the Edge Function

From your project root, run:
```bash
supabase functions deploy generate-image
```

### 2. Set Environment Variable in Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Edge Functions** → **generate-image** → **Settings**
3. Under **Environment Variables**, add:
   - **Key:** `FAL_KEY`
   - **Value:** Your fal.ai API key

### 3. Update Your Code

The code has already been updated:
- ✅ Removed `FAL_KEY` from `vite.config.ts` (no longer exposed to browser)
- ✅ Updated `services/imageGenerationService.ts` to call Edge Function
- ✅ Created Edge Function at `supabase/functions/generate-image/index.ts`

### 4. Remove Client-Side Dependency (Optional)

If you want to clean up, you can remove `@fal-ai/client` from `package.json` since it's no longer used client-side:

```bash
npm uninstall @fal-ai/client
```

**Note:** The Edge Function uses `npm:@fal-ai/client@latest` which is fetched at runtime, so no client-side dependency is needed.

## Testing

After deploying the Edge Function and setting the environment variable:
1. Try generating an image in the admin dashboard
2. The warning should no longer appear
3. Image generation should work exactly as before

## Verification

To verify the fix worked:
1. Build your app: `npm run build`
2. Check the built bundle - FAL_KEY should no longer be present
3. The warning message should disappear from the browser console





