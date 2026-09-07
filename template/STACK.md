# Project context

Edit pipeline.config.json for machine-consumed commands, paths, checks and capabilities. This file explains the project-specific reasoning. The generic gate cards do not need stack substitutions.

## Architecture and invariants

Name the boundaries and correctness rules that must hold; link existing design documents.

## Product guardrails and sensitive data

List user roles, trust boundaries, sensitive fields and consent/retention constraints.

## Tests and performance

Describe applicable test tiers, external services, coverage goals, expected skips and performance budgets. Enable only relevant review capabilities in pipeline.config.json.

## Delivery and recovery

Describe hosting/release steps, required CI checks, rollback and recovery. For a local-only library, state that deployment and hosted operations are inapplicable.

## Technology policy

Document any dependency policy you actually use; no specific governance framework is required.
