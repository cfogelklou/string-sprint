# Technical debt register

| ID | Item | Status | Rationale / exit condition |
| --- | --- | --- | --- |
| TD-UI-001 | Retained `AdBanner` component and AdSense constants | Deferred intentionally | Advertising is disabled by removing its mount and the AdSense bootstrap from `index.html`; retain the isolated component for a deliberate future monetization decision. Delete the component only if ads are permanently retired. |
| TD-UI-002 | Source maps are enabled for production builds | Open | `vite.config.ts` emits source maps; decide separately whether public deployment needs them. |
| TD-SEO-001 | SEO head missing + Applicaudia hub link-back (verified 2026-09-06) | Open | `index.html` has a bare title only — no meta description, canonical, robots, JSON-LD, or OG/Twitter tags (full SEO head missing). Add the full head set, plus a small footer/about mention linking https://applicaudia.se/apps/fake-piano/ (landing page for this app) and https://applicaudia.se/home/ (studio directory). The landing pages exist and are deployed from the root monorepo. Exit: head tags present and validated (OG/rich-results check) and hub links live. |
