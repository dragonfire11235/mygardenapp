# AP01 — LAN- & Tunnel-Zugang

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp`. Eine fertige Garten-PWA (Vue 3 + TypeScript + Vite, vite-plugin-pwa, PrimeVue, Dexie/IndexedDB). Sie läuft bisher nur auf `localhost`. Dieses Paket macht Dev-/Preview-Server im LAN erreichbar und erlaubt Cloudflare-Tunnel-Hosts, damit die App am Handy über eine `https://…trycloudflare.com`-URL nutzbar ist (Voraussetzung für PWA-Installation, folgt in AP02/AP03).
Lies zuerst: `vite.config.ts`, `package.json`, `README.md`.

## Aufgabe
1. In `vite.config.ts` den `server`-Block erweitern: `host: true` und `allowedHosts: ['.trycloudflare.com']` (bestehenden Trefle-Proxy unverändert lassen).
2. Den `preview`-Block genauso erweitern: `host: true`, `allowedHosts: ['.trycloudflare.com']` (Proxy bleibt).
3. In `package.json` ein Skript `"handy": "npm run build && vite preview"` ergänzen (baut und serviert den Produktions-Build — nur dort läuft der echte Service Worker).
4. Prüfe, ob `cloudflared` installiert ist (`cloudflared --version`). Falls nein: NICHT installieren, nur im Abschlussbericht vermerken.
5. README: Abschnitt „## Am Handy nutzen" ergänzen mit: `npm run handy`, dann in zweitem Terminal `cloudflared tunnel --url http://localhost:4173`, die ausgegebene `https://…trycloudflare.com`-URL am Handy öffnen. Plus Installationshinweis für cloudflared (`winget install Cloudflare.cloudflared`) und Hinweis, dass die URL bei jedem Tunnelstart wechselt.

## Regeln
- Nur über die genannten Dateien gehen; keine Quelltexte unter `src/` ändern.
- Nicht ändern: Trefle-Proxy-Konfiguration, PWA-Manifest, Test-Konfiguration in `vite.config.ts`.
- Auf dem Rechner läuft evtl. ein Dev-Server auf Port 5173 mit echten Nutzerdaten — nicht stoppen, nichts an dessen Daten anfassen. Für Tests Port 4173 (preview) verwenden.
- Einfachste tragfähige Lösung; Stil des umgebenden Codes übernehmen; auf Deutsch berichten.

## Abnahme
- [ ] `vite.config.ts`: `server` und `preview` haben `host: true` und `allowedHosts: ['.trycloudflare.com']`
- [ ] `npm run handy` baut fehlerfrei und `http://localhost:4173` liefert die App (HTTP 200, HTML enthält „Mein Garten")
- [ ] Preview ist im LAN erreichbar (Ausgabe zeigt Network-URL)
- [ ] README-Abschnitt „Am Handy nutzen" existiert mit den drei Schritten
- [ ] `npm test` weiterhin grün

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```
npm test                        → alle Tests grün
npm run handy                   → Build ok; Ausgabe zeigt Local: http://localhost:4173 und Network-URL(s)
curl http://localhost:4173      → HTML mit <title>Mein Garten</title>
cloudflared --version           → Version ODER „nicht installiert" im Bericht
# Falls cloudflared vorhanden: Tunnel starten, die https-URL per curl abrufen → gleiche HTML-Antwort
```

## Selbstcheck vor Abgabe
- [ ] Alle Abnahme-Kriterien selbst verifiziert — nicht „sollte gehen"
- [ ] Nichts außerhalb des Auftrags geändert
- [ ] Umsetzungsbericht unten ausgefüllt und Status in `../PLAN.md` aktualisiert

## Umsetzungsbericht (vom Bearbeiter ans Ende DIESER Datei schreiben)
- Geänderte/neue Dateien: <…>
- Verifikations-Ergebnisse wörtlich (Befehl → Ergebnis): <…>
- Offene Punkte/Überraschungen: <ehrlich, auch Fehlschläge; z. B. „cloudflared nicht installiert">

Setze danach in `../PLAN.md` dein AP in der Status-Tabelle auf `umgesetzt`.
