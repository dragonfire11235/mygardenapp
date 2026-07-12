# AP02 — PWA installierbar & offline

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp`. Garten-PWA (Vue 3 + Vite + vite-plugin-pwa, `registerType: 'autoUpdate'`). AP01 hat den Preview-Server LAN-/Tunnel-fähig gemacht (`npm run handy` → Build + Preview auf Port 4173). Dieses Paket ist ein Prüf- und Nachbesserungspaket: Es stellt sicher, dass der Produktions-Build alle PWA-Installationskriterien erfüllt (Manifest, Icons, Service Worker, Offline).
Lies zuerst: `vite.config.ts` (VitePWA-Block), `index.html`, `public/` (Icons), `dist/manifest.webmanifest` (nach Build).

## Aufgabe
1. `npm run build` ausführen; prüfen, dass `dist/` enthält: `sw.js`, `manifest.webmanifest`, `registerSW.js` (bzw. SW-Registrierung im HTML), `pwa-192.png`, `pwa-512.png`.
2. `manifest.webmanifest` inhaltlich prüfen: `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, Icons 192+512 inkl. `purpose: maskable`. Fehlt `start_url`, in `vite.config.ts` im Manifest `start_url: '/'` ergänzen.
3. Preview starten (`vite preview`, Port 4173) und im Browser (Preview-Tools oder DevTools-Protokoll) verifizieren: Service Worker wird registriert und erreicht „activated"; `manifest`-Link im HTML vorhanden.
4. Offline-Probe: Nach erstem Laden den Precache prüfen (Cache Storage enthält `index.html` + Assets). Wenn machbar, Request-Blockade/Offline-Emulation nutzen und neu laden → App rendert weiter.
5. Mängel aus 1–4 direkt in `vite.config.ts` (VitePWA-Manifest) beheben — mehr Dateien sollte dieses Paket nicht anfassen.

## Regeln
- Nicht ändern: App-Quellcode unter `src/` (außer es ist zwingend für ein Installationskriterium — dann im Bericht begründen), Trefle-Proxy, Icons nur ersetzen falls kaputt.
- Auf dem Rechner läuft evtl. ein Dev-Server auf Port 5173 mit echten Nutzerdaten — nicht stoppen, nicht dagegen testen. Alle Tests gegen Port 4173.
- Einfachste tragfähige Lösung; auf Deutsch berichten.

## Abnahme
- [ ] `dist/manifest.webmanifest` enthält name, short_name, start_url, display=standalone, Icons 192+512 (+maskable)
- [ ] Auf `http://localhost:4173` registriert sich der Service Worker (Status „activated", per Browser-Prüfung belegt)
- [ ] Cache Storage enthält nach dem ersten Laden den App-Precache (index.html + JS/CSS)
- [ ] Offline-Reload rendert die App (oder: technisch begründet, warum die Prüfung in dieser Umgebung nicht möglich war — dann Precache-Nachweis Pflicht)
- [ ] `npm run build` und `npm test` grün

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```
npm run build && npm test
Get-Content dist/manifest.webmanifest           → Kriterien aus Abnahme sichtbar
vite preview (4173) + Browser-Prüfung:
  navigator.serviceWorker.getRegistration()     → active.state === 'activated' (ggf. nach Reload)
  caches.keys() / caches.open(...).keys()       → Precache-Einträge vorhanden
```

## Selbstcheck vor Abgabe
- [ ] Alle Abnahme-Kriterien selbst verifiziert — nicht „sollte gehen"
- [ ] Nichts außerhalb des Auftrags geändert
- [ ] Umsetzungsbericht unten ausgefüllt und Status in `../PLAN.md` aktualisiert

## Umsetzungsbericht (vom Bearbeiter ans Ende DIESER Datei schreiben)
- Geänderte/neue Dateien: <…>
- Verifikations-Ergebnisse wörtlich (Befehl → Ergebnis): <…>
- Offene Punkte/Überraschungen: <ehrlich, auch Fehlschläge; z. B. „echtes Handy nicht testbar">

Setze danach in `../PLAN.md` dein AP in der Status-Tabelle auf `umgesetzt`.
