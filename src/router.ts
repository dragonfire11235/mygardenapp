import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  // BASE_URL: bei GitHub-Pages-Deployments liegt die App unter /<repo>/ statt /
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('./features/dashboard/DashboardPage.vue'), meta: { title: 'Dashboard' } },
    { path: '/pflanzen', name: 'plants', component: () => import('./features/plants/PlantsPage.vue'), meta: { title: 'Pflanzen' } },
    { path: '/pflanzen/:id', name: 'plant-detail', component: () => import('./features/plants/PlantDetailPage.vue'), meta: { title: 'Pflanze' } },
    { path: '/beete', name: 'beds', component: () => import('./features/beds/BedsPage.vue'), meta: { title: 'Beete' } },
    { path: '/beete/:id', name: 'bed-detail', component: () => import('./features/beds/BedDetailPage.vue'), meta: { title: 'Beet' } },
    { path: '/aufgaben', name: 'tasks', component: () => import('./features/tasks/TasksPage.vue'), meta: { title: 'Aufgaben' } },
    { path: '/tagebuch', name: 'diary', component: () => import('./features/diary/DiaryPage.vue'), meta: { title: 'Tagebuch' } },
    { path: '/tagebuch/:id', name: 'diary-detail', component: () => import('./features/diary/DiaryDetailPage.vue'), meta: { title: 'Eintrag' } },
    { path: '/geraete', name: 'devices', component: () => import('./features/devices/DevicesPage.vue'), meta: { title: 'Geräte' } },
    { path: '/einstellungen', name: 'settings', component: () => import('./features/settings/SettingsPage.vue'), meta: { title: 'Einstellungen' } },
  ],
})
