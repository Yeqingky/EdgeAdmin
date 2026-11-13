# Frontend migration contract

## Goal

Port every legacy EdgeAdmin page under the assigned directories to the React SPA in `frontend/src/pages/`, keeping the existing visual design and behavior.

## Legacy sources

For each legacy route read:

- View: `web/views/@default/<route>.html`
- Page JS: `web/views/@default/<route>.js`
- Go action: `internal/web/actions/default/<route>/*.go`
- Router: `internal/web/actions/default/<module>/init.go`

The Go action populates `Data`; the JSON mode exposes exactly those keys.

## Data access

```ts
import { apiGet, apiPost, apiPostForm, getCsrfToken } from '../../api/client'
```

- Initial data: `apiGet<Data>(legacyPath, params)` automatically adds `_format=json`; the returned value is `data`.
- Forms and mutations: reuse the legacy POST path with `apiPost` (URL-encoded) or `apiPostForm` (files).
- CSRF: pages whose Go action takes `CSRF *actionutils.CSRF` must request `getCsrfToken()` and include `csrfToken`.
- Pagination HTML from Go (`data.page`) can be rendered with `LegacyPagination`.

## Routes

- Add pages under `frontend/src/pages/<module>/`.
- Export `routes: AppRoute[]` from one `routes.tsx` in your assigned module. `App.tsx` discovers it automatically.
- Route paths must match legacy URLs, e.g. `'/servers/server/settings/http'`.
- Never edit `src/App.tsx`, `src/layout/*`, `src/api/*`, shared components or Go files. If a shared change is unavoidable, report it instead.

## UI

- Reuse Semantic UI class names and `web/views/@default/@layout.css`.
- Reuse `PageHeader`, `StatusLabel`, `LegacyPagination`, `LoadingBlock`, `useConfirm`, `useToast`, and `components/form.tsx`.
- Icons: `lucide-react` only; never add `<i class="icon ...">`.
- Keep Chinese labels and the original layout/table/dialog structure.
- Replace legacy popups with an in-page form/modal while preserving fields and actions.

## Types

- TypeScript strict. Model the actual JSON keys from the Go action.
- Prefer explicit interfaces; avoid `any` except for legacy `maps.Map` payloads that are genuinely dynamic.

## Verification

- Do not run pnpm/build/tests; the parent runs typecheck, build, deploy and e2e after merging.
- However, code must be type-correct by inspection: imports, props, query keys, and route paths.
