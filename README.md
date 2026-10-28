# md.xedoc.ru

Small markdown sharing service for Codex exports and other `.md` files.

## Local run

```powershell
pnpm install
Copy-Item .env.example .env
$env:UPLOAD_TOKEN = "replace-with-a-long-random-token"
pnpm dev
```

Open `http://127.0.0.1:3000`, enter the upload token, choose a `.md` file, and the service returns a public link.

## Upload from Codex

```powershell
$env:MD_SERVICE_URL = "https://md.xedoc.ru"
$env:MD_UPLOAD_TOKEN = "replace-with-a-long-random-token"
pnpm upload "C:\Projects\md.xedoc.ru\shamanchik.ru-tasks-07-06-2026.md"
```

For a local import into the service data folder without HTTP:

```powershell
pnpm import-local ".\shamanchik.ru-tasks-07-06-2026.md"
```

## Environment

`UPLOAD_TOKEN` protects all upload and admin-list endpoints. Public document pages under `/s/:slug`, `/raw/:slug`, and `/download/:slug` do not require auth.

`PUBLIC_BASE_URL` should be `https://md.xedoc.ru` in production so API responses contain shareable links.

`DATA_DIR` stores uploaded markdown files and metadata. The default is `./data`.

## Production

Build and run:

```bash
pnpm install --prod=false
pnpm build
pnpm start
```

The app is designed to listen on `127.0.0.1:3030` behind nginx. Use the files in `deploy/` as templates for systemd and nginx.
