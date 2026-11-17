// Optional live evaluation: sends synthetic flyers to Groq. Requires GROQ_API_KEY.
import { extractPoster } from "../src/lib/announcement-extraction.server.ts";
import { readFileSync, writeFileSync } from "node:fs";
const cases = JSON.parse(
  readFileSync(new URL("./fixtures/poster-editor/cases.json", import.meta.url), "utf8"),
);
const results = [];
for (const fixture of cases) {
  if (results.length) await new Promise((resolve) => setTimeout(resolve, 25000));
  try {
    const result = await extractPoster(
      "data:image/png;base64," +
        readFileSync(new URL("./fixtures/poster-editor/" + fixture.path, import.meta.url)).toString(
          "base64",
        ),
    );
    const passed = fixture.uncertain
      ? result.title === "" && result.review_notes.length > 0
      : fixture.words.every((w: string) => result.title.toLowerCase().includes(w)) &&
        !result.title.startsWith("AFM") &&
        !result.title.startsWith("NORTHBRIDGE");
    results.push({ name: fixture.name, passed, result });
    console.log(JSON.stringify(results.at(-1)));
  } catch (e) {
    results.push({ name: fixture.name, passed: false, error: (e as Error).message });
    console.log(JSON.stringify(results.at(-1)));
  }
  writeFileSync(
    process.env["POSTER_EVAL_RESULTS"] || "/tmp/gc-editor-eval-results.json",
    JSON.stringify(results, null, 2),
  );
}
if (results.some((x) => !x.passed)) process.exitCode = 1;
