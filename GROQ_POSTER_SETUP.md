# Footer admin poster autofill

The production Vercel project is `test1-46st`, connected to `Opus-Zimbabwe/greatcouples-test` and serving `www.greatcouples.org.zw`.

Set `GROQ_API_KEY` as an encrypted server-only Vercel environment variable for Production and Preview, then redeploy. Do not put this key in Git or a `VITE_` variable. The cloud environment's proxy-backed credential does not configure Vercel. The optional `GROQ_VISION_MODEL` defaults to `qwen/qwen3.8-27b`, verified against the available Groq API with a real poster image.

Open the footer lock → Content Admin → New announcement. Upload a PNG, JPEG or WebP poster. Its title, printed date/time, location and remaining description are transcribed into empty fields. Existing text and edits made while reading are preserved. The body uses plain text with paragraphs and line breaks; dates, currency, units and contact details retain their printed meaning. Review all extracted details before publishing. Missing or unreadable facts stay blank.

The image is resized in the browser before a passcode-protected server function calls Groq. The server validates image format, size and output shape; each server instance limits authenticated extraction attempts to six per minute. Serverless instances do not share that in-memory limiter. Provider timeouts/failures leave the uploaded image and manually editable form available. Uploading or extracting never publishes an announcement or changes checkout/payment configuration. Image URLs are not sent to Groq; only the selected image bytes are sent over HTTPS.

Validation:

```sh
node --experimental-strip-types --test tests/announcement-extraction.test.ts
npm run build
```

The local authenticated browser check uses a synthetic event poster, a mocked storage upload, and the real Groq API. It verifies all four form fields without publishing or creating a payment. Full repository TypeScript validation has existing errors in unrelated UI components; report those separately rather than weakening compiler settings.
