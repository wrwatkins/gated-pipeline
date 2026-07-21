# Performance budgets

Path-scoped rule file. Applies to `apps/web/**`. Single source of the perf budget numbers; gate-6 and gate-8 cards point here, never restate. DESIGN §10 also carries a pointer row.

## Bundle size (client — gate 6 owns, blocking)

Grounded on S5 gate-8/9 build record: landing first-load JS = **106 kB** (`○ / 166 B 106 kB`).

- **Public route first-load JS ≤ 130 KB** (gzipped route JS) — the SEO cadence's agreed ceiling (~23% headroom above today's 106 kB landing).
- **App-shell (`/a`, `/u` authenticated routes) first-load JS ≤ 180 KB** (gzipped) — the app shell legitimately carries more interactivity than the static landing; a separate, higher ceiling avoids starving the app or inflating the public budget.

A breach at either ceiling is a **blocking** finding at gate 6.

Until the S6 CI bundle-assert exists (AC-9; S6 deploy BR wires the CI step), gate 6 enforces by inspecting the `next build` output's first-load-JS line.

**S6 wiring (cross-reference):** the CI bundle-size assert (≤ 130 KB gz route JS, blocking in PR CI) and the pre-deploy Lighthouse run (LCP/INP blocking) are S6 deploy build work. The S6 deploy BR wires them AC-9 defines the shape; the S6 deploy DESIGN §10 Launch gates name the enforcement point.

## Core Web Vitals (client — gate 6 owns, blocking once S6 Lighthouse arms)

"Good" thresholds per Google CWV specification:

- **LCP < 2.5 s** (Largest Contentful Paint)
- **CLS < 0.1** (Cumulative Layout Shift)
- **INP < 200 ms** (Interaction to Next Paint)

Blocking at gate 6 once the S6 Lighthouse wiring arms. Until then, gate 6 notes CWV regressions visible in the build output / dev-server as IMPORTANT findings.

## Runtime / query discipline (gate 8 owns, blocking)

- **No N+1 query patterns** on any request path.
- **No unindexed hot-path query** (review query explain / schema indexes per DESIGN §5 for any new query touching a large table).
- **Server-side response-time discipline** for the digest and sweep cron engines — new cron paths must include a timing annotation or PostHog duration event.

A breach is a **blocking** finding at gate 8.
