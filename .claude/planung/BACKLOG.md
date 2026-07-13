# Ideen-Backlog (vom Nutzer freigegeben, 2026-07-07)

Reihenfolge nach Nutzerwunsch: **Detailseiten zuerst.** Fruchtfolge wurde bewusst verworfen.

| # | Idee | Kurzbeschreibung | Status |
|---|---|---|---|
| 1 | **Pflanzen-/Beet-Detailseite** | Eigene Seite pro Pflanze/Beet mit Foto, allen Infos, Verlauf und verknüpften Tagebucheinträgen (statt nur Karte/Dialog). | ✅ erledigt |
| 2 | Aussaat-/Ernte-Kalender | Jahres-Zeitleiste aus `sowingMonths`/`harvestMonths` der Pflanzen — was ist diesen Monat dran. | offen |
| 3 | Ernte-Tracking + Saison-Statistik | „Geerntet"-Aktion mit Menge; Auswertung über die Saison (ertragreich vs. nicht). | offen |
| 4 | Begleitpflanzen im Beetplaner | Beim Platzieren dezenter Hinweis „passt gut zu / lieber nicht neben". Nutzt das Raster. | offen |
| 5 | Aufgaben als .ics-Export | Gieß-/Düngetermine in Google/Apple-Kalender exportieren, ohne Backend. | ✅ erledigt |
| 6 | Beetplan teilen | Beetplaner als PNG rendern + teilen/herunterladen (`plannerImage.ts`, `shareFile.ts`, Button in `BedPlanner`). | ✅ erledigt |
| 7 | Dark Mode | Umschalter in den Einstellungen (Aussehen); `.app-dark` auf `<html>`, folgt anfangs der Systemvorgabe. | ✅ erledigt |
| 8 | Auto-Backup-Erinnerung | Sanfter Hinweis „lange kein Backup" — Sicherheitsnetz bis Supabase-Sync steht. | offen |

**Verworfen:** Fruchtfolge-Warnung (auf Nutzerwunsch).

## Pflanzen-Katalog als Datenfundament (2026-07-13)
Mitgelieferter, durchsuchbarer Katalog (`public/catalog/garten-de.json`, 657 Pflanzen) aus `Import/Pflanzenliste_klein.xlsx`, angereichert per Pipeline in `scripts/`. Getrennt vom Live-`Plant`-Modell; „Übernehmen" nutzt die Trefle-`import`-Naht → vorbefüllter `PlantFormDialog`. Vollständiger Plan/Schema: `C:\Users\Drago\.claude\plans\lovely-dreaming-robin.md`.

| Phase | Inhalt | Status |
|---|---|---|
| 1 | Katalog-Schema (`catalogTypes.ts`), Ingest + Pflege-/Kategorie-Overlay (170 mit Pflege) + Wikidata-Bilder (553), Suchdialog (`CatalogSearchDialog.vue`) + Tests | ✅ erledigt |
| 2 | Nützlinge & Score ✅ via GloBI (`enrich-beneficials-globi.mjs`, 544/650 mit Daten) — Teil-Scores 0–3 + Gesamt-Score 0–5; Anzeige im Katalog-Dialog + Nützlinge-Sektion auf `PlantDetailPage` | erledigt |
| 3 | Blühkalender ✅ (`Plant.bloomMonths` + Formularfeld + Katalog-Mapping + `BloomCalendarWidget` mit Blühlücken-Erkennung). Schnittkalender (`pruningMonths`-Ansicht) noch offen | teilweise |
| 4 | Mischkultur + Assistent/Empfehlungen (`companionsGood/Bad`) | offen |

**Zusätzlich erledigt (13.07.):** Blüh-Timeline im Beetplaner (Monats-Range hebt blühende Kreise hervor) · Beet-Nützlings-Score (aus den enthaltenen Pflanzen aggregiert: bestes je Gruppe + Lücken; angezeigt auf Beet-Detailseite, Beete-Karten und im Beetplaner via `useBedBeneficials`/`BedBeneficialBadge`).

**Nächster Schritt (offen, Nutzerwunsch):** Blumen-/Zierpflanzen-Abdeckung ausbauen — die Quell-Liste ist wildflora-/zimmerpflanzenlastig, echte Gartenblumen sind dünn. Overlay erweitern oder Perenual als 2. Quelle prüfen.
Pipeline-Befehle: `npm run catalog:build`, `npm run catalog:images`.

Parallel weiterhin offen aus PLAN.md: Block A (Handy/Tunnel + Installieren, AP01 in Arbeit), Block B (Supabase-Sync), Home Assistant (Adapter-Naht liegt bereit).
