# Deploy auf Hetzner (Docker + GHCR)

Diese Anleitung bringt die aktuelle `main`-Version auf den Server und startet den Web-Container neu.

## Voraussetzungen

- Repo: `https://github.com/Struppelstrumpf/reineke.pro`
- Image: `ghcr.io/struppelstrumpf/reineke.pro:latest`
- Server-Ordner: `/opt/reineke.pro`
- Docker + Docker Compose Plugin sind auf dem Server installiert.

## A) Lokal pushen (dein PC)

```bash
git add .
git commit -m "Update production version"
git push origin main
```

Hinweis: Der Workflow `.github/workflows/docker-publish.yml` baut und pusht danach automatisch das neue Image nach GHCR.

## B) Auf dem Hetzner-Server deployen

### 1) Einloggen

```bash
ssh <user>@<server-ip>
```

### 2) Projekt aktualisieren

```bash
cd /opt/reineke.pro
git pull origin main
```

### 3) GHCR-Login (nur falls `docker compose pull` fehlschlägt)

```bash
echo <GHCR_PAT> | docker login ghcr.io -u <github-user> --password-stdin
```

### 4) Neues Image ziehen und Container neu starten

```bash
docker compose pull web
docker compose up -d --no-build web
```

### 5) Funktion prüfen

```bash
docker compose ps
docker compose logs --tail=120 web
```

Danach im Browser prüfen:

- `https://www.reineke.pro`

## C) Schneller Rollback (falls nötig)

Wenn eine Version Probleme macht:

```bash
cd /opt/reineke.pro
git log --oneline -n 5
git checkout <letzter-stabiler-commit>
docker compose pull web
docker compose up -d --no-build web
```

Anschließend wieder auf `main` zurück:

```bash
git checkout main
```

## D) Optional aufräumen

```bash
docker image prune -f
```
