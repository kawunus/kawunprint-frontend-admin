## Repo snapshot

- Framework: React + TypeScript scaffolded with Vite. See `package.json` for scripts (`dev`, `build`, `lint`, `preview`).
- Styling: Tailwind CSS (`tailwind.config.ts`, `postcss.config.js`).
- HTTP: Axios wrapper at `src/api/index.ts` (base URL from `VITE_API_BASE_URL`).

## High-level architecture (what to know up-front)

- Single-page admin app with routes defined in `src/App.tsx`. Main protected pages are `/orders` and `/orders/:id`.
- Auth flow:
  - `authApi.login` (in `src/api/auth.ts`) calls `/api/v1/login`. The backend may return the token in different shapes; the function normalizes these (checks `message`, `data`, `token`, or raw string).
  - Token is stored in `localStorage` under `authToken` by `useAuth` (`src/hooks/useAuth.ts`).
  - Axios instance in `src/api/index.ts` automatically adds the token from `localStorage` to `Authorization` header and redirects to `/login` on 401.
- Orders domain:
  - CRUD & history endpoints are wrapped in `src/api/orders.ts` (functions: `getAllOrders`, `getOrderById`, `updateOrder`, `getOrderHistory`, `addOrderHistory`).
  - UI uses `useOrders` (`src/hooks/useOrders.ts`) which fetches orders and exposes `updateOrderStatus` that calls `ordersApi.updateOrder` and `ordersApi.addOrderHistory`.

## Project-specific conventions & patterns

- Token storage and auth:
  - Always use `localStorage.getItem('authToken')` for reads; axios interceptors read it directly (see `src/api/index.ts`).
  - On 401 the app clears `authToken` and navigates to `/login` (axios response interceptor).
- API return shapes:
  - `authApi.login` explicitly handles multiple response shapes; follow that pattern when integrating new auth-like endpoints.
- Table rendering pattern:
  - `src/components/ui/Table.tsx` accepts `columns` with optional `render` functions. Many tables (see `OrderTable`) pass `render` to format fields or render controls (like a status `<select>`).
- Component responsibilities:
  - Smart logic (fetching, state updates) lives in hooks (`useOrders`, `useAuth`). Presentational components (Header, Table, StatusBadge) are small and stateless.

## Useful concrete examples (copy-editable snippets)

- Add auth header (already done in repo): see `src/api/index.ts` where interceptor sets `Authorization: Bearer <token>` from `localStorage`.
- Protected routes: wrap pages with the `ProtectedRoute` pattern used in `src/App.tsx` which reads `useAuth()` and returns `<Navigate to="/login" />` when unauthenticated.
- Table column render signature:
  - Define columns as in `src/components/orders/OrderTable.tsx`:
    - key, title, render?: (value, row) => ReactNode

## Build / dev / debug notes

- Start dev server: `npm run dev` (Vite).
- Build: `npm run build` (runs `tsc` then `vite build`). If `tsc` fails, check types in `src/types`.
- Lint: `npm run lint` (ESLint configured to fail on warnings via `--max-warnings 0`).
- Environment variables:
  - API base: `VITE_API_BASE_URL` (used in `src/api/index.ts`). Default falls back to `http://localhost:8080`.

## Where to look for changes or common PRs

- API changes: `src/api/*` and `src/types/index.ts` (update types when backend contract changes).
- Auth/route issues: `src/hooks/useAuth.ts`, `src/api/index.ts` (interceptors), `src/App.tsx` (ProtectedRoute).
- Orders UI/behavior: `src/hooks/useOrders.ts` and `src/components/orders/*` (OrderTable, StatusBadge, OrderDetail).

## Quick rules for the agent when modifying code

1. Preserve the axios interceptor behavior: always read token from `localStorage` and keep the 401 redirect behavior.
2. When adding endpoints, update `src/types/index.ts` and the corresponding `src/api/*` wrapper functions.
3. Follow the `columns`/`render` table pattern when adding table-based UIs; prefer adding renderers over altering the `Table` core unless necessary.
4. Keep UI components presentational; move data fetching and side-effects into hooks under `src/hooks`.

## After you edit

- Run `npm run dev` and exercise the login -> orders -> order detail flows.
- Run `npm run lint` and fix any linting errors; the repo treats warnings as errors.

---

If any of the sections are unclear or you want more examples (for instance, exact shapes in `src/types/index.ts` or sample responses from the backend), tell me which area to expand and I will iterate. 
