// Kleiner Helfer rund um den globalen <pwa-install>-Dialog (khmyznikov).
// Das Element liegt einmal global (InstallTip.vue) — hier nur Zugriff darauf.

interface PwaInstallEl extends HTMLElement {
  showDialog: (forced?: boolean) => void
}

/** Läuft die App bereits installiert (Standalone)? Dann kein Install-Angebot zeigen. */
export function isAppInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/** Öffnet den Installier-Dialog (Chromium-Prompt bzw. iOS-Anleitung). */
export function openInstallDialog(): void {
  const el = document.querySelector('pwa-install') as PwaInstallEl | null
  el?.showDialog(true)
}
