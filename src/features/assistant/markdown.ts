// Mini-Markdown für Lumi-Antworten. Bewusst kein npm-Paket (Projektregel) —
// nur der kleine Ausschnitt an Syntax, den die KI-Antworten tatsächlich nutzen.
// Escaping zuerst, damit via v-html kein fremdes HTML (z. B. <script>) durchrutscht.

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
}

export function renderLumiMarkdown(text: string): string {
  const escaped = escapeHtml(text)
  const blocks = escaped.split(/\n{2,}/)

  return blocks
    .map((block) => {
      const lines = block.split('\n')
      const isUl = lines.every((l) => /^[-*]\s+/.test(l.trim()))
      const isOl = lines.every((l) => /^\d+\.\s+/.test(l.trim()))

      if (isUl) {
        const items = lines.map((l) => `<li>${renderInline(l.trim().replace(/^[-*]\s+/, ''))}</li>`).join('')
        return `<ul>${items}</ul>`
      }
      if (isOl) {
        const items = lines.map((l) => `<li>${renderInline(l.trim().replace(/^\d+\.\s+/, ''))}</li>`).join('')
        return `<ol>${items}</ol>`
      }
      return `<p>${lines.map(renderInline).join('<br>')}</p>`
    })
    .join('')
}
