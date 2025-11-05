# Setting Up Edge Function via Supabase Dashboard (No CLI Required)

## Option 1: Create Edge Function via Dashboard UI

Since Edge Functions cannot be created via SQL, you need to use the Supabase Dashboard:

### Step 1: Create the Function via Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Create a new function**
4. Name it: `generate-image`
5. Copy and paste the code from `supabase/functions/generate-image/index.ts` into the editor
6. Click **Deploy**

### Step 2: Set Environment Variable

1. After deploying, click on the `generate-image` function
2. Go to **Settings** tab
3. Under **Environment Variables**, click **Add new variable**
4. **Key:** `FAL_KEY`
5. **Value:** Your fal.ai API key
6. Click **Save**

---

## Option 2: Use PostgreSQL Function with pg_net Extension (Alternative)

If you prefer to use SQL, you can create a PostgreSQL function that makes HTTP requests. However, this requires enabling the `pg_net` extension and is more complex. Here's the SQL:



