import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTikTokPreview } from "@/lib/tiktok-preview.functions";
import type { MediaClip } from "./media";
import { clipEmbed, clipLink } from "./media";
import { BrandLogo } from "./BrandLogo";
export function MediaArtwork({
  clip,
  previewPaused = false,
}: {
  clip: MediaClip;
  previewPaused?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const near = useInView(container, { margin: "600px", once: true });
  const visible = useInView(container, { margin: "100px 0px", amount: 0.15 });
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const [dataSaving, setDataSaving] = useState(true);
  useEffect(() => {
    const connection = (
      navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const update = () =>
      setDataSaving(
        !!connection?.saveData || ["slow-2g", "2g"].includes(connection?.effectiveType || ""),
      );
    update();
    connection?.addEventListener("change", update);
    return () => connection?.removeEventListener("change", update);
  }, []);
  const getPreview = useServerFn(getTikTokPreview);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["tiktok-preview", clip.id, clip.url],
    queryFn: () => getPreview({ data: { id: clip.id, url: clipLink(clip) } }),
    enabled: clip.platform === "tiktok" && near,
    staleTime: 1800000,
    retry: false,
  });
  const source =
    clip.platform === "youtube"
      ? `https://i.ytimg.com/vi/${clip.id}/hqdefault.jpg`
      : clip.platform === "tiktok"
        ? data?.thumbnail
        : null;
  return (
    <div
      ref={container}
      className={`gc-media-artwork provider-${clip.platform}`}
      data-preview-id={clip.id}
    >
      {source && source !== failedSource && (
        <img
          key={source}
          className="gc-episode-image"
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(source)}
        />
      )}
      {(clip.platform === "facebook" ||
        (clip.platform === "tiktok" &&
          data?.embedAvailable &&
          visible &&
          !previewPaused &&
          !reducedMotion &&
          !dataSaving &&
          (!source || source === failedSource))) && (
        <iframe
          key={clip.id}
          className="gc-provider-preview"
          title={`${clip.platform} preview ${clip.id}`}
          src={
            clip.platform === "facebook"
              ? clipEmbed(clip)
              : `https://www.tiktok.com/player/v1/${clip.id}?autoplay=1&muted=1&controls=0&description=0&music_info=0`
          }
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          allow="autoplay; encrypted-media"
        />
      )}
      <div className="gc-media-fallback">
        <BrandLogo brand={clip.platform} size={50} />
        {clip.platform === "tiktok" &&
          ((data && data.status !== "available") || (source && source === failedSource)) && (
            <p className="gc-media-preview-note">
              TikTok preview unavailable. Open the video to try playback or use its original link.
            </p>
          )}
      </div>
    </div>
  );
}
