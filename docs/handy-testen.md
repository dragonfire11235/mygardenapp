# Mein Garten am Handy testen

Zwei Wege — **Variante A ist der empfohlene**, weil die App damit auch
unterwegs funktioniert und sich wie eine echte App installieren lässt.

## Variante A: Über GitHub Pages (empfohlen)

Die App wird bei jedem Push auf `main` automatisch gebaut und veröffentlicht
(Workflow: `.github/workflows/deploy.yml`).

**Einmalig nötig:** Das GitHub-Repo muss **öffentlich** sein — GitHub Pages
gibt es im Free-Plan nur für öffentliche Repos. Der Code enthält nichts
Geheimes (der Trefle-Token wird zur Laufzeit eingegeben und nur lokal am
Gerät gespeichert), öffentlich ist also unbedenklich. Falls das Repo privat
ist, öffentlich machen mit:

```powershell
gh repo edit --visibility public --accept-visibility-change-consequences
```

**Am Handy öffnen:**

1. Warte nach einem Push ~2 Minuten (Actions-Tab zeigt den Fortschritt).
2. Öffne am Handy im Browser:
   `https://dragonfire11235.github.io/mygardenapp/`
3. Teste die App direkt im Browser — oder installiere sie:

**Als App installieren:**

- **Android (Chrome):** Menü (⋮) → „App installieren" bzw. „Zum Startbildschirm hinzufügen"
- **iPhone (Safari):** Teilen-Symbol → „Zum Home-Bildschirm"

Danach startet „Garten" wie eine normale App vom Homescreen, funktioniert
offline, und neue Versionen aktivieren sich beim nächsten Öffnen von selbst.

**Wichtig zu wissen:**

- Alle Daten (Pflanzen, Beete, Fotos …) liegen **nur lokal am Gerät** —
  Handy und PC haben getrennte Datenbestände. Zum Übertragen:
  Einstellungen → Datensicherung → Backup exportieren/importieren.
- Die **Trefle-Pflanzensuche** funktioniert auf GitHub Pages nicht
  (Trefle sendet keine CORS-Header; der Proxy existiert nur im Dev-Server).
  Alles andere geht.

## Variante B: Über das WLAN (ohne GitHub, nur zu Hause)

Am PC im Projektordner:

```powershell
npm run dev -- --host
```

Vite zeigt dann eine „Network"-Adresse, z. B. `http://192.168.0.23:5173/` —
diese am Handy im Browser öffnen (Handy muss im selben WLAN sein).
Beim ersten Mal fragt Windows evtl. nach Firewall-Freigabe → zulassen.

**Einschränkung:** Ohne HTTPS gibt es keinen Service Worker — die App läuft
im Browser, lässt sich aber **nicht als App installieren** und funktioniert
nicht offline. Für den echten PWA-Test daher Variante A verwenden.
