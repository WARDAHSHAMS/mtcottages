/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Google Search Console HTML-tag verification token (public; see SiteLayout.astro). */
  readonly PUBLIC_GOOGLE_SITE_VERIFICATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
