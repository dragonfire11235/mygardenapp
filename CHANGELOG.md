# Changelog

Alle nennenswerten Änderungen an „Mein Garten". Format lose nach [Keep a Changelog](https://keepachangelog.com/de/), Versionierung nach [SemVer](https://semver.org/lang/de/).

## 1.0.0 — 2026-07-19

Großes Design-Update: die App tritt jetzt als **lumi** auf („Dein Garten. Dein Zuhause.") — Apple-Liquid-Glass über warmem Grün/Creme, Maskottchen Lumi, durchgehend Nunito. Funktional identisch zu 0.9, aber optisch und strukturell ein sauberer Neuanfang als solide 1.0-Basis. Weiterhin kostenlose, offline-fähige PWA mit lokalen Daten.

### Neu / geändert
- **lumi-Design-System** — Design-Tokens (Farben/Typografie/Abstände/Effekte), selbst gehostete Nunito-Schrift (offline + DSGVO, keine Google-Fonts-Anfrage), Phosphor-Icons durchgängig (PrimeIcons entfernt). Glas-Karten, dunkle Hero-/Upsell-Flächen, sanfte Bewegungen.
- **Neue App-Shell** — Desktop-Sidebar (ab 1024 px) mit allen Bereichen; mobil eine schwebende Glas-Tab-Bar mit **5 Einträgen** (Start, Pflanzen, Beete, Aufgaben, Mehr) — robust bis 320 px; Tagebuch, Geräte, Kalender und Entdeckungen über „Mehr".
- **Konto & Pro (lokal)** — Erststart-Onboarding, lokales Profil (Name in der Begrüßung), Free/Pro-Anzeige und Pro-Upgrade-Dialog. Echte Anmeldung/Bezahlung/Sync ist Roadmap (Supabase/Stripe).
- **Rotierende Lumi-Tipps** am Dashboard — wetterbewusst plus allgemeine Garten-Tipps und Tagebuch-Nudges; Tagebuch-Widget verlinkt direkt zur Seite.
- **A11y & PWA** — sichtbarer Tastatur-Fokus, Safe-Area oben für installierte PWA, lumi-Branding (Name, Icon, Favicon).

### Aufgeräumt
- Einheitliches Icon-Set (Phosphor), Design-Tokens statt Legacy-/Hardcode-Farben, korrekte deutsche Typografie („…"), konsistente Begriffe. Cruft entfernt.

## 0.9.0 — 2026-07-12

Erste öffentlich getaggte Version. Funktional vollständig für den persönlichen Einsatz, als PWA installierbar, offline nutzbar, alle Daten lokal (IndexedDB) mit JSON-Backup.

### Funktionen
- **Pflanzen-Bibliothek** — anlegen/bearbeiten mit Foto, Pflegeintervallen (Gießen/Düngen), Gieß-Startdatum, Aussaat-/Erntemonaten, Standort und Wuchsbreite; Detailseite je Pflanze; nach Kategorie gruppierte, **aufklappbare** Übersicht; Suche/Sortierung; Online-Suche via Trefle.io (optional, mit eigenem Token).
- **Beete & Bepflanzung** — Beete mit Metermaßen und Titelbild; **Beetplaner** (Raster in echten Metern, Pflanzen als maßstäbliche Kreise per Drag & Drop, Kategorie-Auswahl); **Kartenansicht** (eigenes Kartenbild, Beete als Marker); Beet-Detailseite mit Verlauf; Beetplan als Bild teilen.
- **Aufgaben** — einmalig und wiederkehrend; Gieß-/Düngeaufgaben werden automatisch aus den Pflegeintervallen erzeugt; „Alles gegossen", Regen-Hinweis, erledigte Aufgaben löschen; **Export als Kalender (.ics)**.
- **Wetter** — Dashboard-Widget (Open-Meteo, ohne Schlüssel) mit Frost-/Regenhinweis.
- **Gartentagebuch** — Einträge mit Fotos, verknüpfbar mit Pflanzen/Beeten; **Teilen als Bild-Karte** (Titel/Datum/Text/Foto/Tags) plus Original-Fotos.
- **Dashboard** — konfigurierbare Widgets (Sichtbarkeit + Reihenfolge), eigenes Titel- und Hintergrundbild.
- **App** — Dunkelmodus (folgt Systemvorgabe), PWA-Installation, iOS-taugliches Layout (Safe-Area, scrollende Dialoge), JSON-Backup/-Import.

### Technik
Vue 3 + TypeScript + Vite · Pinia · Vue Router · Dexie (IndexedDB) · PrimeVue · vite-plugin-pwa. Storage über ein Interface abstrahiert (späterer Backend-Wechsel ohne Feature-Änderung). Deployment via GitHub Pages.

### Geparkt / als Nächstes
- **Florenliste-Katalog** (`import/Pflanzenliste.xlsx`, ~9.400 Taxa) als durchsuchbares Offline-Nachschlagewerk mit deutschen Namen (GBIF-Anreicherung).
- **Supabase-Sync** (Geräte-übergreifend, echte Push-Benachrichtigungen, Auto-Posting).
- **Home Assistant**-Anbindung (Adapter-Naht liegt bereit).
