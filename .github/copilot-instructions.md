<!-- Copilot instructions for backend-reloop -->
# Copilot / AI Agent Instructions — backend-reloop

Keep guidance concise and focused on files & patterns an engineer will need to be productive immediately.

- Project type: Node (CommonJS) + Express 5 API (main entry `src/server.js`). Uses Node 20 runtime.
- ORM: Prisma (`prisma/schema.prisma`) with `@prisma/client`. DB is PostgreSQL.
- Runtime: `package.json` scripts — `npm run dev` (generates Prisma client then `nodemon src/server.js`) and `npm start`.

Quick start (local dev):

1. Ensure `.env` contains `DATABASE_URL` and AWS creds as in `README.md`.
2. Generate Prisma client: `npx prisma generate` (the `dev` script runs this automatically).
3. Start locally: `npm run dev` or use Docker Compose (`docker-compose up`) which runs `prisma generate` and `prisma migrate deploy` then `npm run dev`.

Architecture & key files
- `src/app.js` — central Express app: middleware (helmet, cors, morgan), static serving rules (`public` and `uploads` in dev), OpenAPI mounted from `src/docs/openapi.yaml` at `/docs`, global error handling (handles JSON parse and Zod errors).
- `src/server.js` — loads `.env` and starts the app on `process.env.PORT || 3000`.
- `src/db.js` — exports a singleton Prisma client; preserves client in `globalThis` for non-production to avoid multiple instances in dev/hot-reload.
- `prisma/schema.prisma` — canonical source of domain model and enums (Condition, Category, sizes, OfferStatus, OrderStatus). Reference it when adding new fields or routes.
- `src/routes/*.js` — one file per resource (e.g., `listings.js`, `users.js`); route files use `prisma` and Zod-based `validate` middleware. Follow the same structure when adding endpoints: schema, helpers, routes.

Conventions and patterns (code you should follow)
- Validation: Zod schemas inline in each route file and `validate` middleware. Return Zod issues with `error: "validation_error"` — keep this shape when raising validation errors.
- Auth: routes that require authentication use `requireAuth` middleware (look at `src/middlewares/requireAuth.js`). When updating endpoints, use `req.user.id` as the authenticated user id.
- Prisma usage: prefer `prisma.<model>.<action>` with `include`/`select` for relations — examples in `src/routes/listings.js` (include `photos` and `seller: { select: {...} }`). Use transactions or `Promise.all` where parallel queries are appropriate.
- Price handling: many routes convert Prisma Decimal -> Number using a small helper `toNumberPrice` in `listings.js`. Preserve numeric conversion when returning JSON to clients.
- Files and uploads: in development `uploads` is served statically from project root; production uses S3. Check `uploads` routes for S3 presigned flows and `@aws-sdk/*` usage.

Operational notes (important for builds/debugging)
- Docker: `docker-compose.yml` defines services `db` (Postgres) and `api`. Compose overrides `DATABASE_URL` to point to `db` during compose runs. Compose command runs `npx prisma generate && npx prisma migrate deploy && npm run dev`.
- Prisma migrations: migrations are in `prisma/migrations`. On local dev you may run `npx prisma migrate dev` when changing models; CI/containers run `prisma migrate deploy`.
- Seeding: run `npm run seed` to execute `prisma/seed.js`.
- OpenAPI: documentation lives in `src/docs/openapi.yaml` and is served at `/docs`.

Style / small gotchas
- CommonJS, not ESM — use `require(...)` and `module.exports`.
- Node/Express error handling: app-wide handler in `src/app.js` special-cases JSON parse errors and Zod errors. Throw errors consistently so the handler returns the proper JSON shape.
- Avoid creating multiple Prisma clients in dev; use the pattern from `src/db.js` (global caching).
- Routes often expect `price` as number but accept strings — follow `z.coerce.number()` or custom parsers like in `listings.js`.

Examples (copyable patterns)
- Pagination & filters (listings):
  - `const items = await prisma.listing.findMany({ where, orderBy, skip, take, include: { photos: true, seller: { select: { id: true, username: true } } } })`
- Create listing with nested photos:
  - `prisma.listing.create({ data: { ...req.body, sellerId: req.user.id, photos: { create: req.body.photos.map(p => ({ url: p.url })) } }, include: { photos: true } })`

When to ask for clarification
- If changing the data model, confirm whether migration should be created automatically or if changes must be coordinated with production DB and the `prisma/migrations` folder.
- If you add new public static assets, note whether they belong under `public` (served in prod) or `uploads` (dev-only static served, S3 in prod).

If something in these instructions is unclear or you want more examples (tests, CI, or a suggested PR template), tell me which section and I will expand it.
