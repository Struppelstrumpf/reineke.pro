# WS Etikettendruck — Windows Companion App

Desktop-App für den Etikettendruck der Weißer-Schäfer-Demo. Läuft im Hintergrund (System-Tray) und verbindet sich mit der Website über `http://127.0.0.1:19284`.

## Voraussetzungen

- Windows 10/11
- Labeldrucker als Windows-Drucker installiert (Treiber des Herstellers)

## Entwicklung starten

```bash
cd apps/ws-label-print
npm install
npm start
```

## Als .exe bauen (portable, kein Installer)

```bash
cd apps/ws-label-print
npm install
npm run dist
```

Die fertige Datei liegt unter `apps/ws-label-print/dist/ws-etikettendruck.exe`.
Diese Datei auf den Server nach `/opt/downloads/ws-etikettendruck.exe` legen — dann
funktioniert der Download-Button in der Verwaltung (Drucker) direkt.

Alternativ baut die GitHub-Action „Build print app (Windows)“ die EXE automatisch
und stellt sie als Artefakt bereit.

## Eigenständiger Druck ohne offene Webseite (Cloud)

1. App starten → Tray-Icon → **Cloud-Einstellungen…**
2. **Server-URL** und **Zugangscode** aus der Verwaltung (Drucker) eintragen
3. „Automatischen Druck aktivieren“, Modus wählen (Intervall **oder** feste Uhrzeiten)
4. Speichern — die App holt neue Bestellungen/Lagerwarnungen selbst und druckt,
   auch wenn keine Webseite geöffnet ist.

## Verbindung Website ↔ App

1. App starten (Tray-Icon erscheint)
2. Website öffnen → Verwaltung → Tab **Drucker**
3. Status „Verbunden“ — Etiketten werden direkt gedruckt
4. Protokoll `wslabel://wake` weckt die App (falls installiert)

## API (localhost)

| Endpoint | Beschreibung |
|----------|--------------|
| `GET /health` | Status, Druckerliste |
| `POST /print` | Etikett drucken (JSON mit orderId, customer, lines) |
| `POST /printer` | Drucker wählen `{ "name": "..." }` |
