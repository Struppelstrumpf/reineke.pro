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

## Als .exe bauen

```bash
cd apps/ws-label-print
npm install
npm run build:win
```

Die fertige Datei liegt unter `apps/ws-label-print/dist/WS-Etikettendruck-1.0.0.exe`.

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
