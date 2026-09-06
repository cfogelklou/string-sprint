# Technical debt register

| ID | Item | Status | Rationale / exit condition |
| --- | --- | --- | --- |
| TD-UI-001 | Retained `AdBanner` component and AdSense constants | Deferred intentionally | Advertising is disabled by removing its mount and the AdSense bootstrap from `index.html`; retain the isolated component for a deliberate future monetization decision. Delete the component only if ads are permanently retired. |
| TD-UI-002 | Source maps are enabled for production builds | Open | `vite.config.ts` emits source maps; decide separately whether public deployment needs them. |
