# Activate the live website database features

Vercel hosts the website, while Lovable Cloud owns the PostgreSQL backend. The public Supabase key in Vercel cannot execute migrations. A Supabase personal management token may not control a Lovable-owned project, and a service-role key alone does not provide a SQL execution API. Do not expose either key in the browser or paste it into chat.

The live backend is `wdlxayrzstifsewigtad`. Read-only checks returned PGRST205 for both `public.content_videos` and `public.site_experience`. The general database already exists; these two feature tables are missing.

In the Lovable project connected to that backend, use its Cloud database migration/SQL facilities or ask Lovable to apply this exact checked-in migration:

`supabase/migrations/20261117193000_activate_site_content.sql`

Suggested Lovable prompt:

> Apply the SQL from 20261117193000_activate_site_content.sql to this project's existing Lovable Cloud database, after confirming its project reference is wdlxayrzstifsewigtad. This adds content_videos and site_experience plus their protected publishing functions and read policies. Do not reset the database, alter payment data/configuration, change admin credentials, publish sample content or turn off the site. Run it transactionally, then confirm anonymous SELECT access to both tables and the presence of site_admin_save_video(text,jsonb) and site_admin_save_experience(text,text,text,jsonb). If the file is not in this Lovable checkout, paste its complete contents from the live GitHub repository into this request.

The combined migration is repeatable and checks that the existing passcode verifier exists. It does not rewrite announcements, books, orders, payments or admin accounts. Do not rerun the entire historical migrations directory on the live database.

After successful application, refresh Content Admin → Videos & podcast. Publishing should become available; Website controls should also detect its backend. Any cached setup warning should clear after refresh/recheck. Verify persistence with an owner-approved video edit, not a fake public test video.
