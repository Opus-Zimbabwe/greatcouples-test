import { parseVideoLink } from "./video-library.ts";
export type TikTokPreview = {
  thumbnail: string | null;
  title: string | null;
  embedAvailable: boolean;
  status: "available" | "restricted" | "unavailable";
};
export function tikTokSource(id: string, input?: string) {
  const video = parseVideoLink(input || `https://www.tiktok.com/@greatcouplestrust/video/${id}`);
  if (video.platform !== "tiktok" || video.id !== id)
    throw new Error("The TikTok link does not match this video.");
  return video.url;
}
export async function fetchTikTokPreview(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<TikTokPreview> {
  const endpoint = new URL("https://www.tiktok.com/oembed");
  endpoint.searchParams.set("url", url);
  const empty = {
    thumbnail: null,
    title: null,
    embedAvailable: false,
    status: "unavailable" as const,
  };
  try {
    const response = await fetcher(endpoint, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json", "User-Agent": "GreatCouplesWebsite/1.0" },
    });
    if (!response.ok)
      return {
        ...empty,
        status: response.status === 403 || response.status === 429 ? "restricted" : "unavailable",
      };
    const data = await response.json();
    const thumbnail = typeof data.thumbnail_url === "string" ? data.thumbnail_url : null;
    let valid = false;
    if (thumbnail && thumbnail.length < 5000) {
      try {
        const parsed = new URL(thumbnail);
        valid = parsed.protocol === "https:" && !parsed.username && !parsed.password;
      } catch {
        /* Invalid provider URL is not an image preview. */
      }
    }
    const id = parseVideoLink(url).id;
    const embedAvailable =
      (data.embed_type === "video" && String(data.embed_product_id) === id) ||
      (typeof data.html === "string" &&
        data.html.includes(`https://www.tiktok.com/player/v1/${id}`));
    return {
      embedAvailable,
      thumbnail: valid ? thumbnail : null,
      title: typeof data.title === "string" ? data.title.slice(0, 300) : null,
      status: valid || embedAvailable ? "available" : "unavailable",
    };
  } catch {
    return empty;
  }
}
