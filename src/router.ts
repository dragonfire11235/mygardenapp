import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('./features/dashboard/DashboardPage.vue'), meta: { title: 'Dashboard' } },
    { path: '/pflanzen', name: 'plants', component: () => import('./features/plants/PlantsPage.vue'), meta: { title: 'Pflanzen' } },
    { path: '/beete', name: 'beds', component: () => import('./features/beds/BedsPage.vue'), meta: { title: 'Beete' } },
    { path: '/aufgaben', name: 'tasks', component: () => import('./features/tasks/TasksPage.vue'), meta: { title: 'Aufgaben' } },
    { path: '/tagebuch', name: 'diary', component: () => import('./features/diary/DiaryPage.vue'), meta: { title: 'Tagebuch' } },
    { path: '/geraete', name: 'devices', component: () => import('./features/devices/DevicesPage.vue'), meta: { title: 'Geräte' } },
    { path: '/einstellungen', name: 'settings', component: () => import('./features/settings/SettingsPage.vue'), meta: { title: 'Einstellungen' } },
  ],
})
