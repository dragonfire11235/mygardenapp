# lumi 🌱

**Dein Garten. Dein Zuhause.** Eine Progressive Web App (PWA) zur Verwaltung des eigenen Gartens — komplett offline-fähig, alle Daten bleiben lokal im Browser (IndexedDB). Warmes Liquid-Glass-Design mit Maskottchen Lumi, durchgehend Deutsch (Du-Form).

## Funktionen

- **Dashboard** — konfigurierbare Widgets (Sichtbarkeit & Reihenfolge in den Einstellungen), eigenes Titelbild und Hintergrundbild, Wetter-Widget mit Frost-/Regenhinweis (Open-Meteo, kostenlos, Standort in den Einstellungen)
- **Pflanzen** — eigene Pflanzenbibliothek mit Pflegeintervallen, Aussaat-/Erntemonaten, eigenem Foto und Anbindung an die [Trefle](https://trefle.io)-Pflanzendatenbank; „Neue Pflanze anlegen" geht direkt aus jeder Pflanzen-Auswahl heraus
- **Beete** — Beete anlegen (mit Foto als Titelbild und Metermaßen) und Bepflanzungen über die Zeit verfolgen; **Kartenansicht**: eigenes Kartenbild (z. B. Google-Maps-Screenshot) hochladen und Beete als Marker platzieren; **Beetplaner**: Raster in echten Metern, Pflanzen als Kreise in Wuchsbreite (Kategorie-Standard, pro Pflanze überschreibbar) per Drag & Drop platzieren — Überlappung erlaubt (Kräuter unterm Baumrand)
- **Aufgaben** — einmalige und wiederkehrende Gartenaufgaben; Gieß- und Düngeaufgaben werden automatisch aus den Pflegeintervallen der Pflanzen erzeugt
- **Tagebuch** — Einträge mit Fotos, verknüpfbar mit Pflanzen und Beeten; Teilen über das Geräte-Menü (Web-Share, am Handy z. B. Instagram/WhatsApp)
- **Geräte** — Schalter, Ventile und Sensoren über austauschbare Adapter (aktuell: Demo; vorbereitet: Home Assistant)
- **Datensicherung** — JSON-Export/-Import, optional mit Fotos

## Technik

Vue 3 (`<script setup>`) · TypeScript · Vite · Pinia · Dexie (IndexedDB) · vite-plugin-pwa · PrimeVue (Dialoge/Formulare) · Phosphor Icons · Nunito (selbst gehostet). Optik über ein eigenes Design-Token-System (`src/styles/tokens/`).

Die Storage-Schicht ist als Interface abstrahiert (`src/data/storage.ts`) — ein späteres Server-Backend kann den lokalen `DexieProvider` ersetzen, ohne dass sich die Features ändern. Alle Entitäten sind sync-fähig aufgebaut (UUID, Zeitstempel, Soft-Delete).

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm test         # Tests (Vitest + fake-indexeddb)
npm run build    # Typprüfung + Produktions-Build
npm run preview  # Produktions-Build lokal testen
```

Für die Trefle-Pflanzensuche wird ein kostenloser API-Token benötigt (in den App-Einstellungen hinterlegen). Der Dev-Server proxied Trefle-Anfragen über `/api/trefle` (CORS).

## Am Handy nutzen

Die App lässt sich am Smartphone über einen Cloudflare-Tunnel öffnen (nötig für die PWA-Installation, weil dafür HTTPS gebraucht wird):

1. `npm run handy` — baut den Produktions-Build und startet den Preview-Server (`http://localhost:4173`). Nur hier läuft der echte Service Worker.
2. In einem zweiten Terminal: `cloudflared tunnel --url http://localhost:4173`
3. Die ausgegebene `https://…trycloudflare.com`-URL am Handy im Browser öffnen.

`cloudflared` installieren (falls noch nicht vorhanden): `winget install Cloudflare.cloudflared`

Hinweis: Die Tunnel-URL wechselt bei jedem Start von `cloudflared` — beim nächsten Mal also erneut die neu ausgegebene Adresse verwenden.

## Roadmap

1. Supabase/Backend für Sync über mehrere Geräte + echte Push-Benachrichtigungen; ermöglicht dann auch Social-Media-Auto-Posting (`SocialPublisher`-Schnittstelle in `src/features/diary/socialShare.ts` liegt bereit)
2. Home Assistant-Anbindung (Adapter-Schnittstelle in `src/features/devices/adapters/` liegt bereit)
