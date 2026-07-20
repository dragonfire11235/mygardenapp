import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  // BASE_URL: bei GitHub-Pages-Deployments liegt die App unter /<repo>/ statt /
  history: createWebHistory(import.meta.env.BASE_URL),
  // Seitenwechsel starten oben (Zurück-Navigation behält die Scroll-Position)
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
  routes: [
    { path: '/', name: 'dashboard', component: () => import('./features/dashboard/DashboardPage.vue'), meta: { title: 'Dashboard' } },
    { path: '/pflanzen', name: 'plants', component: () => import('./features/plants/PlantsPage.vue'), meta: { title: 'Pflanzen' } },
    { path: '/pflanzen/:id', name: 'plant-detail', component: () => import('./features/plants/PlantDetailPage.vue'), meta: { title: 'Pflanze' } },
    { path: '/beete', name: 'beds', component: () => import('./features/beds/BedsPage.vue'), meta: { title: 'Beete' } },
    { path: '/beete/:id', name: 'bed-detail', component: () => import('./features/beds/BedDetailPage.vue'), meta: { title: 'Beet' } },
    { path: '/aufgaben', name: 'tasks', component: () => import('./features/tasks/TasksPage.vue'), meta: { title: 'Aufgaben' } },
    { path: '/tagebuch', name: 'diary', component: () => import('./features/diary/DiaryPage.vue'), meta: { title: 'Tagebuch' } },
    { path: '/tagebuch/:id', name: 'diary-detail', component: () => import('./features/diary/DiaryDetailPage.vue'), meta: { title: 'Eintrag' } },
    { path: '/kalender', name: 'calendar', component: () => import('./features/plants/CalendarPage.vue'), meta: { title: 'Kalender' } },
    { path: '/entdeckungen', name: 'sightings', component: () => import('./features/sightings/SightingsPage.vue'), meta: { title: 'Entdeckungen' } },
    { path: '/geraete', name: 'devices', component: () => import('./features/devices/DevicesPage.vue'), meta: { title: 'Geräte' } },
    { path: '/gardena/callback', name: 'gardena-callback', component: () => import('./features/devices/gardena/GardenaCallback.vue'), meta: { title: 'Gardena' } },
    { path: '/einstellungen', name: 'settings', component: () => import('./features/settings/SettingsPage.vue'), meta: { title: 'Einstellungen' } },
  ],
})
