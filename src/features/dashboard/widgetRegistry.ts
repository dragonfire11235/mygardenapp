// Registry aller Dashboard-Widgets. Jedes Feature-Modul steuert hier
// seine Karten bei; Sichtbarkeit und Reihenfolge legt der User in den
// Einstellungen fest (gespeichert als dashboardLayout).
//
// Neues Widget hinzufügen: Komponente im Feature-Ordner anlegen und
// hier einen Eintrag ergänzen — Dashboard und Einstellungen ziehen
// beide aus dieser Liste.

import type { Component } from 'vue'
import DueTasksWidget from '../tasks/DueTasksWidget.vue'
import SeasonWidget from '../plants/SeasonWidget.vue'
import BloomCalendarWidget from '../plants/BloomCalendarWidget.vue'
import PruningCalendarWidget from '../plants/PruningCalendarWidget.vue'
import BedsWidget from '../beds/BedsWidget.vue'
import RecentDiaryWidget from '../diary/RecentDiaryWidget.vue'
import SensorsWidget from '../devices/SensorsWidget.vue'
import SwitchesWidget from '../devices/SwitchesWidget.vue'
import WeatherWidget from '../weather/WeatherWidget.vue'

export interface WidgetDefinition {
  id: string
  title: string
  component: Component
}

export const widgetRegistry: WidgetDefinition[] = [
  { id: 'weather', title: 'Wetter', component: WeatherWidget },
  { id: 'tasks', title: 'Fällige Aufgaben', component: DueTasksWidget },
  { id: 'season', title: 'Saison', component: SeasonWidget },
  { id: 'bloom', title: 'Blühkalender', component: BloomCalendarWidget },
  { id: 'pruning', title: 'Schnittkalender', component: PruningCalendarWidget },
  { id: 'beds', title: 'Beete', component: BedsWidget },
  { id: 'diary', title: 'Tagebuch', component: RecentDiaryWidget },
  { id: 'sensors', title: 'Sensoren', component: SensorsWidget },
  { id: 'switches', title: 'Schalter', component: SwitchesWidget },
]
