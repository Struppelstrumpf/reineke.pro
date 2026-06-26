# Deploy auf Hetzner (Docker + GHCR)

Diese Anleitung bringt die aktuelle `main`-Version auf den Server — inkl. **Nasebär**, **Weißer Schäfer** und **persistenter API-Daten** (Pins, Auth, Bestellungen).

## Voraussetzungen

- Repo: `https://github.com/Struppelstrumpf/reineke.pro`
- Web-Image: `ghcr.io/struppelstrumpf/reineke.pro:latest`
- API-Image: `ghcr.io/struppelstrumpf/reineke.pro-api:latest`
- Server-Ordner: `/opt/reineke.pro`
- Docker + Docker Compose Plugin auf dem Server
- Reverse-Proxy (Caddy/nginx) leitet `https://www.reineke.pro` → `localhost:8080`

## A) Lokal pushen (dein PC)

```bash
git add .
git commit -m "feat: Nasebär demo, API persistence, production deploy"
git push origin main
```

Der Workflow `.github/workflows/docker-publish.yml` baut danach automatisch **web** und **api** und pusht beide Images nach GHCR (~2–5 Min.).

Status prüfen: https://github.com/Struppelstrumpf/reineke.pro/actions

## B) Auf dem Hetzner-Server deployen

### 1) Einloggen

```bash
ssh root@5.75.246.39
```

(Passwort oder SSH-Key wie beim letzten Mal.)

### 2) Projekt aktualisieren

```bash
cd /opt/reineke.pro
git pull origin main
```

Falls der Ordner noch nicht existiert (Erstinstallation):

```bash
mkdir -p /opt/reineke.pro
cd /opt/reineke.pro
git clone https://github.com/Struppelstrumpf/reineke.pro.git .
```

### 3) GHCR-Login (nur falls `docker compose pull` mit „unauthorized“ fehlschlägt)

GitHub → Settings → Developer settings → Personal access tokens → Token mit `read:packages`:

```bash
echo DEIN_GITHUB_TOKEN | docker login ghcr.io -u Struppelstrumpf --password-stdin
```

### 4) Neue Images ziehen und Container starten (manuell, wie bisher)

```bash
docker network create reineke-net 2>/dev/null || true

docker pull ghcr.io/struppelstrumpf/reineke.pro-api:latest
docker stop reineke-api 2>/dev/null; docker rm reineke-api 2>/dev/null
docker run -d --name reineke-api --restart unless-stopped \
  --network reineke-net --network-alias api \
  -p 127.0.0.1:19290:19290 \
  -v reineke_data:/data \
  -e TZ=Europe/Berlin \
  ghcr.io/struppelstrumpf/reineke.pro-api:latest

docker pull ghcr.io/struppelstrumpf/reineke.pro:latest
docker stop reineke-pro 2>/dev/null; docker rm reineke-pro 2>/dev/null
docker run -d --name reineke-pro --restart unless-stopped \
  --network reineke-net \
  -p 8080:80 \
  ghcr.io/struppelstrumpf/reineke.pro:latest
```

> **Wichtig:** Beide Container müssen im Netzwerk `reineke-net` sein. Sonst startet `reineke-pro` nicht (nginx kann `api` nicht auflösen).

Alternativ per Compose (falls `/opt/reineke.pro` mit `docker-compose.yml` existiert):

```bash
cd /opt/reineke.pro
docker compose pull
docker compose up -d --no-build
```

### 5) Funktion prüfen

```bash
docker ps
curl -s http://127.0.0.1:19290/api/health
curl -I http://localhost:8080
curl -s https://www.reineke.pro/api/health
```

- https://www.reineke.pro
- Sidebar → **Nasebär (Demo)** → `/demo/nasebaer`
- Sidebar → **Weißer Schäfer (Demo)**
- Registrierung / Login / Marker setzen (Daten landen in `reineke_data`)

## C) Migration vom alten Einzel-Container

Falls noch nur `reineke-pro` (ohne API) läuft:

```bash
docker stop reineke-pro 2>/dev/null; docker rm reineke-pro 2>/dev/null
cd /opt/reineke.pro
git pull origin main
docker compose pull
docker compose up -d --no-build
```

## D) Schneller Rollback

```bash
cd /opt/reineke.pro
git log --oneline -n 5
git checkout <letzter-stabiler-commit>
docker compose pull
docker compose up -d --no-build
git checkout main
```

## E) Optional aufräumen

```bash
docker image prune -f
```
