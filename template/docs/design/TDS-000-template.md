# TDS-### — <title>

**BR:** BR-### · **Status:** draft | approved · **Date:** YYYY-MM-DD

## Approach

<Chosen approach; alternatives considered with grounded tradeoffs (not a beauty contest — say why the losers lose).>

## Data model delta

<Tables/columns added or changed; migration compatibility (expand → migrate → contract).>

## API delta

<Routes added/changed under your API routes; request/response shapes; authz.>

## Placement

<What goes in the core package (pure) vs the app vs the db package. Core purity is non-negotiable.>

## Test plan

- Unit: <named cases>
- Integration: <named cases>
- E2E: <named flows>

## Security

<AuthZ, input validation, token handling, rate limits, PII touchpoints.>

## Ops

<your analytics events, structured logs, alarms, rollback, cron/idempotency implications.>

## PADU check

<New/changed tech and its PADU tier; justification or ADR link.>

## Open questions

- …
