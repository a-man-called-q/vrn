# TODO: Multitenancy + Subscription — Backoffice UI Gaps

Catatan hasil audit tanggal 2026-05-19. Konteks: flow `vrn create ... → vrn add backoffice → vrn add portal → vrn add subscription`.

## Status sekarang

### Backoffice — user management ✅ SUDAH ADA
- `templates/apps/backoffice/src/routes/_dashboard/users/index.tsx` — list user (tabel + filter status, role badges, stats Total/Active, tombol Create)
- `templates/apps/backoffice/src/routes/_dashboard/users/new.tsx` — create user
- `templates/apps/backoffice/src/routes/_dashboard/roles/index.tsx` + `roles/new.tsx` — role management
- Server handlers dual-mode: `src/server/[local]users.ts`, `[zitadel]users.ts`, `[local]roles.ts`, `[zitadel]roles.ts`

### Subscription addon ⚠️ PARTIAL (backend only)
`src/addons/subscription.ts` saat ini inject ke setiap service Elysia:
- `packages/db-{service}/src/[subscription]subscription.ts` — schema tabel `subscriptions`
- `apps/{service}/src/routes/[subscription]billing.ts` — endpoint `/billing/plans` (masih stub TODO) + `/billing/webhook` Stripe
- ENV `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` di `.env.example`

### Multitenancy ⚠️ PARTIAL (schema only)
- `templates/packages/db/src/[multiTenant]tenants.ts` — schema tabel `tenants` ada
- Belum ada addon CLI `vrn add multitenancy` di `src/addons/` (cuma flag `[multiTenant]` di template path, dipicu dari context/template-data)
- Belum ada UI tenant management di backoffice

## Yang BELUM ada / perlu dikerjain

### 1. Backoffice — Subscription UI
Bikin route baru di `templates/apps/backoffice/src/routes/_dashboard/`:
- `subscriptions/index.tsx` — list subscriber (per tenant kalau multitenant), status (active/canceled/past_due), current period, customer
- `subscriptions/new.tsx` atau detail page
- `plans/index.tsx` + `plans/new.tsx` — plan management (kalau plan mau dikelola dari backoffice, bukan di Stripe dashboard)

Server handler yang perlu dibuat (mirip pola `[local]users.ts` / `[zitadel]users.ts`):
- `src/server/[subscription]subscriptions.ts` — query ke service Elysia atau langsung ke `db-{service}.subscriptions`
- `src/server/[subscription]plans.ts`

Nav sidebar update: `src/components/dashboard/app-sidebar.tsx` — tambah menu Subscriptions / Billing (gate dengan flag `[subscription]`).

### 2. Lengkapi endpoint backend
`templates/apps/api/src/routes/[subscription]billing.ts:9-12` — `/billing/plans` masih return `{ plans: [] }`. Perlu:
- Skema tabel `plans` (belum ada — sekarang cuma `subscriptions`)
- Endpoint CRUD plan
- Endpoint list subscriptions (untuk konsumsi backoffice)

### 3. Backoffice — Tenant management UI (kalau multitenancy aktif)
Bikin route:
- `_dashboard/tenants/index.tsx` — list tenant
- `_dashboard/tenants/new.tsx` — create tenant
- Server handler `[multiTenant]tenants.ts`
- Sidebar entry dengan gate `[multiTenant]`

### 4. Addon CLI `vrn add multitenancy` (opsional)
Saat ini multitenancy ke-trigger dari flag template path `[multiTenant]`, bukan addon eksplisit. Kalau mau konsisten sama pola `vrn add subscription`, bikin `src/addons/multitenancy.ts` yang:
- Copy `packages/db/src/[multiTenant]tenants.ts` ke db package per service
- Update `context.ts` / `template-data.ts` set flag `multiTenant: true`
- Inject middleware tenant resolver ke service Elysia (header `X-Tenant-Id` atau subdomain)

### 5. Cross-cut: subscription ↔ multitenancy
Schema `subscriptions.entityId` (apps/api/.../billing.ts:35) sekarang ambil dari `sub.metadata.entityId ?? sub.customer`. Kalau multitenant, `entityId` harus = `tenantId`. Perlu:
- Saat tenant baru dibuat → auto-create Stripe customer dengan `metadata.entityId = tenantId`
- Backoffice subscriptions page bisa di-filter per tenant

## File references untuk start
- Pola UI list page yang udah jadi (template): `templates/apps/backoffice/src/routes/_dashboard/users/index.tsx`
- Pola server handler dual-mode: `templates/apps/backoffice/src/server/[zitadel]users.ts`
- Subscription addon installer: `src/addons/subscription.ts`
- Schema subscription: `templates/packages/db/src/[subscription]subscription.ts`
- Schema tenant: `templates/packages/db/src/[multiTenant]tenants.ts`
- Sidebar nav: `templates/apps/backoffice/src/components/dashboard/app-sidebar.tsx`

## Saran urutan kerja
1. Lengkapi backend dulu: tabel `plans` + endpoint `/billing/plans` & `/billing/subscriptions` (list)
2. Backoffice: subscriptions list page + plans CRUD
3. Multitenancy addon (kalau jadi diformalin) + tenants UI
4. Wire subscription ↔ tenant (entityId = tenantId)
