import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePoster, extractPoster } from "../src/lib/announcement-extraction.server.ts";
const facts = {
  event_name: "Marriage seminar",
  event_type: "",
  organiser: "Community Fellowship",
  hosts: [],
  guests: [],
  date_text: "21 November 2026 at 10:00 AM",
  location: "Harare Community Hall",
  details: ["Admission USD 10"],
  heading_uncertain: false,
  review_notes: [],
};
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
    review_notes: [],
  };
  const original = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only";
  try {
    let calls = 0;
    const result = await extractPoster(image, async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (calls === 0) assert.equal(body.messages[1].content[1].image_url.url, image);
      else assert.equal(JSON.parse(body.messages[1].content).organiser, "Community Fellowship");
      assert.equal(body.response_format.type, "json_object");
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(
                  calls++ === 0
                    ? facts
                    : { ...expected, body: expected.body.replace(/\n/g, "\\n") },
                ),
              },
            },
          ],
        }),
      );
    });
    assert.deepEqual(result, expected);
    assert.equal(calls, 2);
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

test("ambiguous headings stay blank even if the editor invents a confident title", async () => {
  const original = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only";
  let calls = 0;
  try {
    const result = await extractPoster(
      image,
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify(
                    calls++ === 0
                      ? {
                          ...facts,
                          event_name: "",
                          heading_uncertain: true,
                          review_notes: ["Two equally prominent events are advertised."],
                        }
                      : {
                          title: "An invented title",
                          date_text: "Tomorrow",
                          location: "An invented venue",
                          body: "Admission USD 10",
                          review_notes: [],
                        },
                  ),
                },
              },
            ],
          }),
        ),
    );
    assert.equal(result.title, "");
    assert.equal(result.date_text, facts.date_text);
    assert.equal(result.location, facts.location);
    assert.ok(result.review_notes.some((note) => note.includes("Two equally")));
  } finally {
    if (original === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = original;
  }
});
test("a failed editorial pass preserves the manual-entry fallback", async () => {
  const original = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only";
  let calls = 0;
  try {
    await assert.rejects(
      () =>
        extractPoster(image, async () =>
          calls++ === 0
            ? new Response(
                JSON.stringify({ choices: [{ message: { content: JSON.stringify(facts) } }] }),
              )
            : new Response("private provider error", { status: 503 }),
        ),
      /Image reading is unavailable/,
    );
  } finally {
    if (original === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = original;
  }
});
