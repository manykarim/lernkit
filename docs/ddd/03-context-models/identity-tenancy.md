# Identity & Tenancy — Context Model

## Purpose

Generic context — OIDC SSO, multi-tenant isolation, roles, and permissions (Research §8 Phase 5). Exposed as an **Open Host Service** producing short-lived bearer tokens consumed by every other context. Lernkit does not innovate here; we integrate off-the-shelf (Keycloak reference, Azure AD, Okta, Google Workspace).

## Aggregates

- **Tenant** — the top-level isolation boundary. Aggregate root because every tenant-scoped query predicates on it; RLS policies key off its id.
- **Identity** — the OIDC-federated account record. Aggregate root for the user side.

## Entities

- _Workspace_ — sub-partition of a Tenant (e.g. per-team content collections).
- _Organization_ — marketing alias for Tenant.
- _Author / Reviewer / Learner / Admin_ — principal types, each tied to an Identity.

## Value objects

- *Role* — named permission bundle
- *Permission* — fine-grained grant (e.g. `course:publish`, `package:build`, `runner:execute`)
- *Subject* — OIDC `sub` claim
- *AuthSession* — HTTP cookie-bound auth span (see [collision §C.2](../01-ubiquitous-language.md#c2-explicit-collision-resolution--session))
- *OidcIssuer* — registered provider endpoint
- *TenantIsolationKey* — the RLS predicate value

## Domain events

- `AccountCreated` (NOT "registered" — see [collision §C.1](../01-ubiquitous-language.md#c1-explicit-collision-resolution--registration))
- `TenantProvisioned`
- `WorkspaceCreated`
- `RoleGranted` / `RoleRevoked`
- `AuthSessionOpened` / `AuthSessionClosed`
- `ImpersonationStarted` / `ImpersonationEnded` (audit-critical)

## Application services / use cases

- **ProvisionTenant** — creates Tenant + initial Admin + first Workspace.
- **FederateIdentity** — binds an OIDC Subject to a Lernkit Identity.
- **MintBearerToken** — the core OHS operation.
- **AssertPermission** — predicate check at every downstream service boundary.
- **SwitchTenant** — for multi-tenant users.

## Integration with other contexts

- **Downstream — every other context:** OHS. The bearer token carries Subject + Tenant + Role claims.
- **Billing (Phase 5)** plugs in here for subscription state.
- **No inbound dependencies** — IAM does not call other contexts; other contexts read its tokens.

## Invariants and business rules

1. **Every tenant-scoped query MUST predicate on `TenantIsolationKey`** — enforced by Postgres RLS (Research §8 Phase 5 risks).
2. **Role assignments are Workspace-scoped, not global** — an `Author` in Workspace A is not automatically an `Author` in Workspace B.
3. **OIDC is the only authentication path** for privileged roles — no password auth for Admin/Author (Research §8 Phase 5).
4. **Impersonation is audit-logged** with both the acting and impersonated Subject; emits compensating events on end.
5. **Account creation is called `AccountCreated`, never `registered`** — protects the Tracking vocabulary (Research DDD collision §C.1).
6. **Tenant deletion is soft** — data retained per compliance policy; reassigning IDs is not permitted.
