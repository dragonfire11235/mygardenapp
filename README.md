# lumi 🌱

**Dein Garten. Dein Zuhause.** Eine Progressive Web App (PWA) zur Verwaltung des eigenen Gartens — komplett offline-fähig, alle Daten bleiben lokal im Browser (IndexedDB). Warmes Liquid-Glass-Design mit Maskottchen Lumi, durchgehend Deutsch (Du-Form).

## Funktionen

- **Dashboard (Start)** — tageszeitabhängige Begrüßung, rotierende Lumi-Tipps, Wetter-Widget mit Frost-/Regenhinweis (Open-Meteo, kostenlos); konfigurierbare Widgets (Sichtbarkeit & Reihenfolge unter „Mehr"), eigenes Titel- und Hintergrundbild
- **Pflanzen** — eigene Bibliothek mit Pflegeintervallen, Aussaat-/Erntemonaten, Foto; mitgelieferter, durchsuchbarer **Katalog (657 Pflanzen)** — die Suche schlägt passende Arten direkt zum Hinzufügen vor; optionale Online-Suche über [Trefle](https://trefle.io)
- **Beete** — Beete mit Foto und Metermaßen; **Kartenansicht** (eigenes Kartenbild, Beete als Marker); **Beetplaner** (Raster in echten Metern, Pflanzen als maßstäbliche Kreise per Drag & Drop)
- **Aufgaben** — einmalige und wiederkehrende Gartenaufgaben; Gieß-/Düngeaufgaben werden automatisch aus den Pflegeintervallen erzeugt; Export als Kalender (.ics)
- **Tagebuch** — Einträge mit Fotos, verknüpfbar mit Pflanzen und Beeten; Teilen über das Teilen-Menü des Geräts (Web-Share)
- **Entdeckungen** — kleines Sammelspiel: Insekten und Vögel fotografieren, Abzeichen und Biodiversitäts-Score, Nützlings-Tipps aus den eigenen Pflanzen
- **Kalender** — Blüh- und Schnittzeiten der eigenen Pflanzen als Jahresübersicht
- **Geräte (Smart Garden)** — Schalter, Ventile und Sensoren über austauschbare Adapter (aktuell: Demo; vorbereitet: Home Assistant)
- **Konto** — Erststart-Onboarding und lokales Profil (Name); Free/Pro-Anzeige mit Pro-Upgrade-Dialog. *Konto/Pro ist derzeit ein lokaler Platzhalter — echte Anmeldung, Bezahlung und Geräte-Sync sind Roadmap.*
- **Datensicherung** — JSON-Export/-Import, optional mit Fotos; Dunkelmodus

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

Für die Trefle-Pflanzensuche wird ein kostenloser API-Token benötigt (unter „Mehr" hinterlegen). Der Dev-Server proxied Trefle-Anfragen über `/api/trefle` (CORS); auf GitHub Pages funktioniert die Live-Suche mangels Proxy nicht — der mitgelieferte Katalog dagegen schon (offline).

## Am Handy nutzen

Die App lässt sich am Smartphone über einen Cloudflare-Tunnel öffnen (nötig für die PWA-Installation, weil dafür HTTPS gebraucht wird):

1. `npm run handy` — baut den Produktions-Build und startet den Preview-Server (`http://localhost:4173`). Nur hier läuft der echte Service Worker.
2. In einem zweiten Terminal: `cloudflared tunnel --url http://localhost:4173`
3. Die ausgegebene `https://…trycloudflare.com`-URL am Handy im Browser öffnen.

`cloudflared` installieren (falls noch nicht vorhanden): `winget install Cloudflare.cloudflared`

Hinweis: Die Tunnel-URL wechselt bei jedem Start von `cloudflared` — beim nächsten Mal also erneut die neu ausgegebene Adresse verwenden.

## Roadmap

Detailplan zum Weg vom kostenlosen 1.0 zum bezahlten SaaS: `.claude/planung/PLAN-profil-saas.md`.

1. **Konto & Sync (SaaS):** Supabase-Backend, Anmeldung (E-Mail+Passwort), Geräte-übergreifender Sync (local-first, Last-Write-Wins), danach Stripe-Abo. Die Konto-/Pro-UI ist bereits als Naht vorhanden.
2. **Home Assistant** — Adapter-Schnittstelle in `src/features/devices/adapters/` liegt bereit.
3. Social-Media-Auto-Posting (`SocialPublisher` in `src/features/diary/socialShare.ts` liegt bereit), echte Push-Benachrichtigungen.
