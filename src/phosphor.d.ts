// @phosphor-icons/web exportiert seine Stile als CSS-Subpaths ("./fill",
// "./bold") ohne Typdeklarationen — vue-tsc im Build-Modus (-b) braucht
// diese Shims für die Side-Effect-Imports in main.ts.
declare module '@phosphor-icons/web/fill'
declare module '@phosphor-icons/web/bold'
