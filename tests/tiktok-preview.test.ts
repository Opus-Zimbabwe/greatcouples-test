import { test } from "node:test";
import assert from "node:assert/strict";
import { tikTokSource, fetchTikTokPreview } from "../src/lib/tiktok-preview.server.ts";
import { videoStorageStatus } from "../src/lib/video-library.ts";
const id = "7707735777718930706";
test("preview requests preserve the actual submitted creator and reject mismatched sources", () => {
  assert.equal(
    tikTokSource(id, `https://www.tiktok.com/@another.creator/video/${id}?tracking=1`),
    `https://www.tiktok.com/@another.creator/video/${id}`,
  );
  for (const url of [
    `https://www.tiktok.com/@someone/video/7662832812252204308`,
    `https://evil.test/@x/video/${id}`,
    `https://www.youtube.com/watch?v=q5FlDKsrzQk`,
  ])
    assert.throws(() => tikTokSource(id, url));
});
test("uses the full official source URL and only returns a real HTTPS thumbnail", async () => {
  const source = tikTokSource(id, `https://www.tiktok.com/@another.creator/video/${id}`);
  const result = await fetchTikTokPreview(source, async (url) => {
    assert.equal(new URL(String(url)).origin, "https://www.tiktok.com");
    assert.equal(new URL(String(url)).searchParams.get("url"), source);
    return new Response(
      JSON.stringify({
        thumbnail_url: "https://cdn.example.test/actual-video.jpg",
        title: "Real video",
      }),
    );
  });
  assert.equal(result.status, "available");
  assert.equal(result.title, "Real video");
});
test("provider blocks, empty metadata and malformed images are not presented as successful previews", async () => {
  for (const code of [403, 429])
    assert.equal(
      (
        await fetchTikTokPreview(
          "https://www.tiktok.com/@x/video/" + id,
          async () => new Response("", { status: code }),
        )
      ).status,
      "restricted",
    );
  for (const data of [
    {},
    { status_msg: "Something went wrong", status_code: 400 },
    { thumbnail_url: "javascript:alert(1)" },
    { thumbnail_url: "https://user:password@cdn.example.test/img" },
  ]) {
    const result = await fetchTikTokPreview(
      "https://www.tiktok.com/@x/video/" + id,
      async () => new Response(JSON.stringify(data)),
    );
    assert.equal(result.thumbnail, null);
    assert.equal(result.status, "unavailable");
  }
});
test("schema activation is distinguished from connection and permission errors", () => {
  assert.equal(videoStorageStatus(null), "ready");
  for (const code of ["PGRST205", "42P01"])
    assert.equal(videoStorageStatus({ code }), "setup_required");
  for (const code of ["42501", "PGRST301", "57014"])
    assert.equal(videoStorageStatus({ code }), "unavailable");
});

test("new TikTok oEmbed responses can provide a player without a thumbnail", async () => {
  const result = await fetchTikTokPreview(
    tikTokSource(id),
    async () =>
      new Response(
        JSON.stringify({
          embed_type: "video",
          embed_product_id: id,
          html: `<iframe src="https://www.tiktok.com/player/v1/${id}"></iframe>`,
        }),
      ),
  );
  assert.equal(result.status, "available");
  assert.equal(result.embedAvailable, true);
  assert.equal(result.thumbnail, null);
});
