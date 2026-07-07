# AP03 — In-App „Installieren"-Button

## Kontext
Projekt: `C:\Users\Drago\MyGardenApp`. Garten-PWA (Vue 3 `<script setup>` + TypeScript, PrimeVue, Pinia). Die App ist installierbar (AP02); dieses Paket macht die Installation sichtbar: ein Button in den Einstellungen statt des versteckten Browser-Menüs.
Lies zuerst: `src/features/settings/SettingsPage.vue` (Aufbau der Einstellungs-Sektionen), `src/main.ts`, `src/App.vue`.

## Aufgabe
1. Neu `src/features/settings/usePwaInstall.ts` — ein Composable mit Modul-Scope-State (das `beforeinstallprompt`-Event feuert nur einmal, früh):
   - Auf Modulebene `window.addEventListener('beforeinstallprompt', …)` registrieren: `e.preventDefault()`, Event in einer Modul-Variablen + `ref` halten.
   - `appinstalled`-Listener: gespeichertes Event verwerfen.
   - Export `usePwaInstall()` → `{ canInstall: ComputedRef<boolean>, isStandalone: boolean, isIos: boolean, install(): Promise<void> }`.
     `install()` ruft `prompt()` auf dem gespeicherten Event und verwirft es danach.
     `isStandalone` = `matchMedia('(display-mode: standalone)').matches`; `isIos` = iPhone/iPad-UserAgent-Erkennung.
2. Das Composable-Modul in `src/main.ts` per Import aktivieren (Seiteneffekt-Import, damit der Listener vor dem Event steht).
3. In `SettingsPage.vue` eine neue Karten-Sektion „App installieren" (über der Trefle-Sektion):
   - Wenn `canInstall`: Button „App installieren" (Icon `pi pi-download`) → `install()`.
   - Sonst wenn `isIos` und nicht `isStandalone`: Hinweistext „Am iPhone/iPad: Teilen-Menü → ‚Zum Home-Bildschirm'."
   - Sonst wenn `isStandalone`: Text „Die App ist installiert. ✓"
   - Sonst: Sektion ausblenden (Browser bietet gerade keine Installation an).

## Regeln
- TypeScript strikt (`erasableSyntaxOnly`: keine Constructor-Parameter-Properties); `beforeinstallprompt` hat keinen DOM-Typ → eigenes Interface `BeforeInstallPromptEvent` im Composable deklarieren.
- Stil der bestehenden Einstellungs-Sektionen übernehmen (`<section class="card"><h2>…`).
- Nicht ändern: andere Sektionen der SettingsPage, `vite.config.ts`, Service-Worker-Verhalten.
- Auf dem Rechner läuft evtl. ein Dev-Server auf Port 5173 mit echten Nutzerdaten — nicht stoppen; UI-Tests gegen `vite preview` auf Port 4173.
- Einfachste tragfähige Lösung; auf Deutsch berichten.

## Abnahme
- [ ] `npx vue-tsc -b` fehlerfrei, `npm test` grün, `npm run build` grün
- [ ] Ohne `beforeinstallprompt`-Event und außerhalb iOS/Standalone ist die Sektion nicht sichtbar
- [ ] Wird `beforeinstallprompt` ausgelöst (im Browser simulierbar: `window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { preventDefault(){}, prompt: async()=>{} }))` VOR dem Öffnen der Einstellungen bzw. reaktiv), erscheint der Button; Klick ruft `prompt()` auf (nachweisbar über gesetzten Marker im Stub)
- [ ] Nach `appinstalled`-Event verschwindet der Button

## Verifikation — selbst ausführen, BEVOR du fertig meldest
```
npx vue-tsc -b && npm test && npm run build
vite preview (4173) → Einstellungen öffnen:
  1) Standard: keine „App installieren"-Sektion (Chromium-Preview feuert das Event meist nicht)
  2) Event-Stub wie oben dispatchen → Sektion + Button erscheinen (reaktiv)
  3) Klick → Stub-prompt wurde aufgerufen (Marker prüfen)
  4) window.dispatchEvent(new Event('appinstalled')) → Button weg
```

## Selbstcheck vor Abgabe
- [ ] Alle Abnahme-Kriterien selbst verifiziert — nicht „sollte gehen"
- [ ] Nichts außerhalb des Auftrags geändert
- [ ] Offene Punkte ehrlich benannt
