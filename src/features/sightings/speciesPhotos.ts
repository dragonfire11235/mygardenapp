// Referenzfotos der kuratierten Arten (wissenschaftlicher Name → Bild-URL),
// aus public/catalog/species-photos.json (siehe scripts/build-species-photos.mjs).
// Muster wie catalogApi.loadCatalog(): einmalig laden, für die Sitzung cachen.

let cache: Promise<Record<string, string>> | null = null

export function loadSpeciesPhotos(): Promise<Record<string, string>> {
  if (!cache) {
    const url = `${import.meta.env.BASE_URL}catalog/species-photos.json`
    cache = fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, string>>) : {}))
      .catch(() => {
        cache = null // bei Fehler erneut versuchen lassen
        return {}
      })
  }
  return cache
}
