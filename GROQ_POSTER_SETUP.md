# Footer admin poster autofill

The production Vercel project is `test1-46st`, connected to `Opus-Zimbabwe/greatcouples-test` and serving `www.greatcouples.org.zw`.

Set `GROQ_API_KEY` as an encrypted server-only Vercel environment variable for Production and Preview, then redeploy. Do not put this key in Git or a `VITE_` variable. The cloud environment's proxy-backed credential does not configure Vercel. The optional `GROQ_VISION_MODEL` defaults to `qwen/qwen3.8-27b`. A second, text-only editorial pass uses `GROQ_EDITOR_MODEL` (default `openai/gpt-oss-120b`) to arrange the interpreted facts. Both models use the same server-side key.

Open the footer lock → Content Admin → New announcement. Upload a PNG, JPEG or WebP poster. The visual pass identifies the event separately from organisers, sponsors, hosts and guests. The editorial pass creates a concise event headline and places supporting roles in the description, filling empty fields. Genuine competing or missing headings leave the title blank and show a specific review note instead of guessing. Printed date/time and venue are retained from the visual pass. Existing text and edits made while reading are preserved. The body uses plain text with paragraphs and line breaks; dates, currency, units and contact details retain their printed meaning. Review all extracted details before publishing. Missing or unreadable facts stay blank.

The image is resized in the browser before a passcode-protected server function calls Groq. The server validates image format, size and output shape; each server instance limits authenticated extraction attempts to six per minute. Serverless instances do not share that in-memory limiter. Provider timeouts/failures leave the uploaded image and manually editable form available. Uploading or extracting never publishes an announcement or changes checkout/payment configuration. Image URLs are not sent to Groq; only the selected image bytes are sent over HTTPS.

Validation:

```sh
node --experimental-strip-types --test tests/announcement-extraction.test.ts
npm run build
```

The local authenticated browser check uses a synthetic event poster, a mocked storage upload, and the real Groq API. It verifies all four form fields without publishing or creating a payment. Full repository TypeScript validation has existing errors in unrelated UI components; report those separately rather than weakening compiler settings.


## Editorial interpretation regression checks

`node --experimental-strip-types tests/evaluate-posters.ts` optionally runs five live synthetic flyer cases against Groq: an organiser-led braai poster, a sponsor-led workshop, a recurring series/session, competing event headings and a missing heading. It uses provider credits and pauses 25 seconds between cases to respect model rate limits. Results go to `/tmp/gc-editor-eval-results.json` (override with `POSTER_EVAL_RESULTS`). These cases passed during this update; they are a representative sample, not an accuracy guarantee for all flyer designs. Run the unit test file separately for validation, editorial failures and uncertainty enforcement without provider calls.
