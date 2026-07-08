// Teilt eine Datei über das Geräte-Menü (Web-Share) oder lädt sie als Fallback herunter.
// Gleiche Idee wie socialShare.ts, aber für beliebige Dateien (z. B. den Beetplan als Bild).

export async function shareOrDownload(
  file: File,
  opts: { title?: string; text?: string } = {},
): Promise<void> {
  if (
    typeof navigator !== 'undefined' &&
    'canShare' in navigator &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: opts.title, text: opts.text })
      return
    } catch (e) {
      // Abbruch durch den User ist kein Fehler; sonst Fallback auf Download
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
}
