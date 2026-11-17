import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TikTokPreview } from "./tiktok-preview.server";
const cache = new Map<string, { expires: number; value: TikTokPreview }>();
const pending = new Map<string, Promise<TikTokPreview>>();
export const getTikTokPreview = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z
      .object({ id: z.string().regex(/^\d{15,22}$/), url: z.string().max(2048).optional() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { tikTokSource, fetchTikTokPreview } = await import("./tiktok-preview.server");
    const source = tikTokSource(data.id, data.url);
    const cached = cache.get(source);
    if (cached && cached.expires > Date.now()) return cached.value;
    if (pending.has(source)) return pending.get(source)!;
    const promise = (async () => {
      try {
        const value = await fetchTikTokPreview(source);
        cache.set(source, {
          expires: Date.now() + (value.status === "available" ? 1800000 : 180000),
          value,
        });
        if (cache.size > 100) cache.delete(cache.keys().next().value!);
        return value;
      } finally {
        pending.delete(source);
      }
    })();
    pending.set(source, promise);
    return promise;
  });
