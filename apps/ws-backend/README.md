# WS Backend (Datei-Datenbank)

Kleines, abhängigkeitsfreies Node-Backend, das die Weißer-Schäfer-Daten zentral
in **einer JSON-Datei** speichert. Die Angular-App spiegelt ihre bestehenden
`localStorage`-Keys über dieses Backend, sodass alle Daten (Benutzer,
Bestellungen, Lager, Sortiment, Chat, Einstellungen) geräteübergreifend
persistent sind.

## Lokal starten

```bash
cd apps/ws-backend
WS_DATA_FILE=./data/ws-store.json npm start
# läuft auf http://localhost:19290
```

## Endpunkte

- `GET  /api/health` – Status
- `GET  /api/state` – alle Werte `{ values: { key: jsonString } }`
- `GET  /api/state/:key` – einzelner Wert
- `PUT  /api/state/:key` – Body `{ "value": "<jsonString>" }`

## Docker

```bash
docker build -t ws-backend .
docker run -d --name reineke-api -p 19290:19290 -v reineke_data:/data ws-backend
```

Die Datenbank liegt im Volume unter `/data/ws-store.json` und übersteht
Container-Neustarts und Deployments. Backup = diese eine Datei kopieren.
