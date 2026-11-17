-- Activate the missing live-site video and presentation storage.
-- Additive and repeatable: does not delete data, alter payments, change passcodes,
-- publish videos, or turn the site off. Apply in the matching Lovable Cloud project.
BEGIN;
DO $preflight$ BEGIN
 IF to_regprocedure('public.verify_site_admin_passcode(text)') IS NULL THEN
  RAISE EXCEPTION 'Wrong database or missing existing site-admin verifier; no changes applied';
 END IF;
END $preflight$;
CREATE TABLE IF NOT EXISTS public.content_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('youtube','tiktok','facebook')),
  video_id text NOT NULL CHECK (length(video_id) BETWEEN 5 AND 80),
  url text NOT NULL CHECK (length(url) <= 2048 AND url ~ '^https://'),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  placement text NOT NULL CHECK (placement IN ('podcast','social')),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  origin_key text CHECK (origin_key IS NULL OR origin_key ~ '^(podcast|social):(youtube|tiktok|facebook):[A-Za-z0-9_-]{5,80}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(platform, video_id, placement)
);
ALTER TABLE public.content_videos ENABLE ROW LEVEL SECURITY;
-- Public rows contain video metadata only; hidden rows override bundled/imported videos.
DO $policy$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='content_videos' AND policyname='Read website video metadata') THEN
  CREATE POLICY "Read website video metadata" ON public.content_videos FOR SELECT USING (true);
 END IF;
END $policy$;
GRANT SELECT ON public.content_videos TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.content_videos FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.site_admin_save_video(_passcode text, _video jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.content_videos%ROWTYPE;
BEGIN
  IF NOT public.verify_site_admin_passcode(_passcode) THEN RAISE EXCEPTION 'Invalid passcode'; END IF;
  IF COALESCE(_video->>'url','') !~ '^https://(www\.|m\.)?(youtube\.com|youtu\.be|tiktok\.com|facebook\.com|fb\.watch)/' THEN RAISE EXCEPTION 'Unsupported video URL'; END IF;
  IF NULLIF(_video->>'id','') IS NOT NULL THEN
    UPDATE public.content_videos SET platform=_video->>'platform',video_id=_video->>'video_id',url=_video->>'url',title=trim(_video->>'title'),placement=_video->>'placement',sort_order=COALESCE((_video->>'sort_order')::integer,0),active=COALESCE((_video->>'active')::boolean,true),origin_key=_video->>'origin_key'
    WHERE id=(_video->>'id')::uuid RETURNING * INTO result;
    IF result.id IS NULL THEN RAISE EXCEPTION 'Video no longer exists. Refresh the library.'; END IF;
  ELSE
    INSERT INTO public.content_videos(platform,video_id,url,title,placement,sort_order,active,origin_key)
    VALUES(_video->>'platform',_video->>'video_id',_video->>'url',trim(_video->>'title'),_video->>'placement',COALESCE((_video->>'sort_order')::integer,0),COALESCE((_video->>'active')::boolean,true),_video->>'origin_key')
    ON CONFLICT(platform,video_id,placement) DO UPDATE SET url=EXCLUDED.url,title=EXCLUDED.title,sort_order=EXCLUDED.sort_order,active=EXCLUDED.active,origin_key=COALESCE(EXCLUDED.origin_key,content_videos.origin_key) RETURNING * INTO result;
  END IF;
  RETURN to_jsonb(result);
END; $$;
REVOKE ALL ON FUNCTION public.site_admin_save_video(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_admin_save_video(text,jsonb) TO anon,authenticated,service_role;

-- Isolated by site_key: test controls never alter the production website's settings.
CREATE TABLE IF NOT EXISTS public.site_experience (
 site_key text PRIMARY KEY CHECK(site_key ~ '^[A-Za-z0-9_-]{1,80}$'),
 settings jsonb NOT NULL CHECK(jsonb_typeof(settings)='object'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_experience ENABLE ROW LEVEL SECURITY;
DO $policy$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_experience' AND policyname='Read public website presentation settings') THEN
  CREATE POLICY "Read public website presentation settings" ON public.site_experience FOR SELECT USING(true);
 END IF;
END $policy$;
GRANT SELECT ON public.site_experience TO anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.site_experience FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.site_admin_save_experience(_passcode text,_site_key text,_section text,_settings jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.site_experience%ROWTYPE;
BEGIN
 IF NOT public.verify_site_admin_passcode(_passcode) THEN RAISE EXCEPTION 'Invalid passcode'; END IF;
 IF _section NOT IN ('hero','availability','message') THEN RAISE EXCEPTION 'Invalid settings section'; END IF;
 IF jsonb_typeof(_settings->'heroSlides') IS DISTINCT FROM 'array' OR jsonb_array_length(_settings->'heroSlides') NOT BETWEEN 1 AND 10 OR jsonb_typeof(_settings->'maintenance'->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid website settings'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(_settings->'heroSlides') slide WHERE slide->>'active'='true') THEN RAISE EXCEPTION 'Keep at least one hero slide visible'; END IF;
 INSERT INTO public.site_experience(site_key,settings) VALUES(_site_key,_settings)
 ON CONFLICT(site_key) DO UPDATE SET settings=CASE _section WHEN 'hero' THEN jsonb_set(site_experience.settings,'{heroSlides}',EXCLUDED.settings->'heroSlides') WHEN 'message' THEN jsonb_set(site_experience.settings,'{maintenance,message}',EXCLUDED.settings#>'{maintenance,message}') ELSE jsonb_set(site_experience.settings,'{maintenance}',EXCLUDED.settings->'maintenance') END,updated_at=now() RETURNING * INTO result;
 RETURN to_jsonb(result);
END;$$;
REVOKE ALL ON FUNCTION public.site_admin_save_experience(text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_admin_save_experience(text,text,text,jsonb) TO anon,authenticated,service_role;


NOTIFY pgrst, 'reload schema';
COMMIT;
