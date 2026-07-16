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
| 3 | Blühkalender ✅ + **Schnittkalender ✅** (`Plant.bloomMonths`/`pruningMonths` + Formularfelder + Katalog-Mapping + `BloomCalendarWidget`/`PruningCalendarWidget`; Helfer `monthRows`/`monthGaps` generalisiert) | erledigt |
| 4 | Mischkultur + Assistent/Empfehlungen ✅ (`companionsGood/Bad` + `companions.ts`; Anzeige: Mischkultur-Sektion Pflanzen-Detail, Beet-Check auf Beet-Detail, Grün/Rot-Markierung im Beetplaner) | erledigt |

**Zusätzlich erledigt (13.–15.07.):**
- Blüh-Timeline im Beetplaner (Monats-Range hebt blühende Kreise hervor) · Beet-Nützlings-Score (`useBedBeneficials`/`BedBeneficialBadge`, 3 Anzeigeorte).
- **Kalender-Seite** `/kalender` (Umschalter Blüte/Schnitt, nach Beeten gruppiert + aufklappbar) · Blüh-/Schnitt-Widget auf 7 Zeilen gedeckelt mit „Ganzer Kalender"-Link.
- **Tagebuch-Detailseite** `/tagebuch/:id` (Ansehen statt sofort Bearbeiten).
- **iOS-Zoom-Bugfix** (Formularfelder 16px) · **Foto-GC-Fix** (`gardenMapPhotoId` wurde vom Aufräum-Sweep gelöscht → Kartenbild verschwand).
- **Zierpflanzen-Ausbau** ✅ (`scripts/ornamental-overlay.mjs`): ~100 Stauden/Zierpflanzen aus „sonstiges" angereichert → blumen 40→132, mit Blütezeit 102→204.

**Garten-Entdeckungen (16.–17.07., `PLAN.md`) ✅ komplett umgesetzt (AP01–08):** Foto-Sammelspiel für Insekten & Vögel — Sichtungs-Entität + Storage/Backup/GC, Erfassungs-Dialog (`SightingDialog.vue`) mit austauschbarer Identifikations-Naht (`SpeciesIdentifier`, aktuell `ManualIdentifier`), Sammelalbum `/entdeckungen` + Dashboard-Widget, Abzeichen (`achievements.ts`), Biodiversitäts-Score (`biodiversity.ts`), Nützlings-Tipps aus den eigenen Pflanzen (`tips.ts`/`useSightingTip.ts`), GloBI-Vogelwert je Pflanze (`beneficials.birds`, Gruppe 🐦 in `beneficials.ts`) + kuratierte Artenlisten für alle 5 Gruppen (`speciesCatalog.ts`, ~78 Arten) mit Autocomplete im Dialog. Vorgänger (Handy/Supabase) archiviert in `PLAN-handy-supabase.md`.

**Zusätzlich erledigt (17.07.):**
- **Nützlings-/Vogel-Icons auf der Pflanzenkarte** (`PlantBeneficialBadge.vue`, Katalog-Lookup per botanischem Namen, Muster wie `BedBeneficialBadge`) — nicht erst auf der Detailseite sichtbar.
- **Referenzfotos für die "noch zu entdecken"-Artenliste**: `speciesCatalog.data.json` um `scientificName` je Art ergänzt; neues Build-Script `scripts/build-species-photos.mjs` lädt Fotos aus Wikidata (Taxon-Name → Bild, gleiches Muster wie `enrich-images-wikidata.mjs`) nach `public/catalog/species-photos.json` (77/78 Arten mit Foto). `SpeciesPhotoChip.vue` zeigt das Foto bei Hover (Desktop, reines CSS) oder Antippen (Handy, JS-State, schließt bei Klick außerhalb). Neuer npm-Befehl `species:photos`.

**Roadmap (zurückgestellt):**
- **KI-Arterkennung für Entdeckungen** — Foto → Art automatisch (iNaturalist o. ä. via Proxy). Die Naht (`SpeciesIdentifier` + `source`) wird im aktiven Plan gebaut; die KI-Implementierung selbst ist Folge-Idee. Status: offen.
- **Gardena smart system** — Entschieden: Cloudflare Worker als Proxy (CORS + Secret → kein Direktzugriff aus dem Browser). Nötig: Application Key + Secret vom Husqvarna-Dev-Portal (beide APIs verbunden). Details im Plan-File. `GardenaAdapter` an der bestehenden `DeviceAdapter`-Naht, `AdapterId 'gardena'`.
- **Home Assistant** (Adapter-Naht bereit), **Supabase-Sync** (PLAN.md Block B), Aussaat-/Ernte-Kalender, Ernte-Tracking, Perenual als 2. Datenquelle.
Pipeline-Befehle: `npm run catalog:build`, `npm run catalog:images`, `catalog:beneficials`, `species:photos`.
