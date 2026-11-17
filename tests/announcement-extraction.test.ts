import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePoster, extractPoster } from "../src/lib/announcement-extraction.server.ts";
const image =
  "data:image/png;base64," + Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString("base64");
test("rejects non-images, SVG and oversized uploads before a provider call", () => {
  for (const x of [
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/png;base64,aGVsbG8=",
    "https://example.test/image.png",
    "data:image/png;base64," + Buffer.alloc(2100000).toString("base64"),
  ])
    assert.throws(() => validatePoster(x));
});
test("retains date, currency and paragraph formatting from a structured result", async () => {
  const expected = {
    title: "Marriage seminar",
    date_text: "21 November 2026 at 10:00 AM",
    location: "Harare Community Hall",
    body: "Admission USD 10\n\nCall +263 777 000 000",
  };
  const original = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only";
  try {
    const result = await extractPoster(image, async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.messages[1].content[1].image_url.url, image);
      assert.equal(body.response_format.type, "json_object");
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(expected) } }] }),
      );
    });
    assert.deepEqual(result, expected);
  } finally {
    if (original === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = original;
  }
});
test("handles throttling and rejects malformed or unexpected provider output", async () => {
  const original = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only";
  try {
    await assert.rejects(
      () =>
        extractPoster(image, async () => new Response("private provider detail", { status: 429 })),
      /busy/,
    );
    for (const content of [
      "not JSON",
      JSON.stringify({
        title: "Title",
        body: "Text",
        date_text: "",
        location: "",
        unexpected: "injection",
      }),
    ])
      await assert.rejects(
        () =>
          extractPoster(
            image,
            async () => new Response(JSON.stringify({ choices: [{ message: { content } }] })),
          ),
        /reliably/,
      );
  } finally {
    if (original === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = original;
  }
});
