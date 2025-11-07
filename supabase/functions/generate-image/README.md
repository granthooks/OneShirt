# Generate Image Edge Function

This Supabase Edge Function handles secure image generation using fal.ai's Nano Banana model.

## Setup

1. **Deploy the function:**
   ```bash
   supabase functions deploy generate-image
   ```

2. **Set the FAL_KEY environment variable in Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to Edge Functions → generate-image → Settings
   - Add environment variable: `FAL_KEY` with your fal.ai API key

## Security

This function keeps the FAL_KEY secure on the server side, preventing it from being exposed in the browser bundle.

## Usage

The function accepts a POST request with a JSON body:
```json
{
  "prompt": "A cat wearing sunglasses floating in space, synthwave style"
}
```

Returns:
```json
{
  "imageDataUrl": "data:image/png;base64,..."
}
```




