# Freitag-Checkliste (vor Kundentermin)

## 1) Deployment

- Letzte Änderungen committen und nach `main` pushen.
- Nach Anleitung `DEPLOY_HETZNER.md` auf Hetzner deployen.
- Webseite unter `https://www.reineke.pro` im Inkognito-Fenster öffnen.

## 2) Pflicht-Tests (5 Minuten)

- Login als Kunde funktioniert.
- Bestellung anlegen funktioniert.
- Admin: `Bestellungen bearbeiten` druckt neue Bestellungen.
- Etikett enthält:
  - Firmenname
  - Straße Nr
  - PLZ Ort
  - `Tel. ...`
  - Leerzeile
  - `Datum/Uhrzeit: ...`
  - Leerzeile
  - `BESTELLTE ARTIKEL`
- Artikelzeilen auf Etikett: kleiner und nicht fett.

## 3) WS Etikettendruck lokal prüfen

- `WS-Etikettendruck-1.4.5.exe` läuft.
- In der App ist der richtige Drucker ausgewählt.
- Ein Testetikett drucken.

## 4) Notfallplan bereitlegen

- Letzten stabilen Commit notieren.
- Rollback-Befehle aus `DEPLOY_HETZNER.md` griffbereit halten.
