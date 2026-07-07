// Wetter über Open-Meteo — kostenlos, ohne API-Schlüssel, CORS-fähig.
// Geocoding (Ortssuche) und Vorhersage sind getrennte Endpunkte.

import type { WeatherLocation } from '../settings/settingsStore'

export interface GeoResult {
  name: string
  lat: number
  lon: number
  admin: string
  country: string
}

export interface DayForecast {
  date: string
  code: number
  tempMax: number
  tempMin: number
  precipProbability: number
}

export interface Weather {
  currentTemp: number
  currentCode: number
  humidity: number
  days: DayForecast[]
  /** Nächtlicher Frost in den nächsten Tagen erwartet */
  frostWarning: boolean
  /** Heute hohe Regenwahrscheinlichkeit → Gießen kann warten */
  rainToday: boolean
}

interface GeoApiResponse {
  results?: {
    name: string
    latitude: number
    longitude: number
    admin1?: string
    country?: string
  }[]
}

interface ForecastApiResponse {
  current: { temperature_2m: number; weather_code: number; relative_humidity_2m: number }
  daily: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
  }
}

/** Ortssuche für die Standortwahl in den Einstellungen. */
export async function searchLocation(name: string): Promise<GeoResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=de&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Ortssuche nicht erreichbar.')
  const json: GeoApiResponse = await res.json()
  return (json.results ?? []).map((r) => ({
    name: r.name,
    lat: r.latitude,
    lon: r.longitude,
    admin: r.admin1 ?? '',
    country: r.country ?? '',
  }))
}

export async function fetchWeather(loc: WeatherLocation): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=temperature_2m,weather_code,relative_humidity_2m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=4`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Wetterdaten nicht erreichbar.')
  const json: ForecastApiResponse = await res.json()

  const days: DayForecast[] = json.daily.time.map((date, i) => ({
    date,
    code: json.daily.weather_code[i],
    tempMax: Math.round(json.daily.temperature_2m_max[i]),
    tempMin: Math.round(json.daily.temperature_2m_min[i]),
    precipProbability: json.daily.precipitation_probability_max[i] ?? 0,
  }))

  return {
    currentTemp: Math.round(json.current.temperature_2m),
    currentCode: json.current.weather_code,
    humidity: json.current.relative_humidity_2m,
    days,
    frostWarning: days.some((d) => d.tempMin <= 0),
    rainToday: (days[0]?.precipProbability ?? 0) >= 60,
  }
}

// WMO-Wettercodes → deutsches Kürzel + Emoji
const codeMap: { max: number; label: string; icon: string }[] = [
  { max: 0, label: 'Klar', icon: '☀️' },
  { max: 2, label: 'Teils bewölkt', icon: '⛅' },
  { max: 3, label: 'Bewölkt', icon: '☁️' },
  { max: 48, label: 'Nebel', icon: '🌫️' },
  { max: 57, label: 'Niesel', icon: '🌦️' },
  { max: 67, label: 'Regen', icon: '🌧️' },
  { max: 77, label: 'Schnee', icon: '🌨️' },
  { max: 82, label: 'Schauer', icon: '🌧️' },
  { max: 86, label: 'Schneeschauer', icon: '🌨️' },
  { max: 99, label: 'Gewitter', icon: '⛈️' },
]

export function weatherLabel(code: number): string {
  return (codeMap.find((c) => code <= c.max) ?? codeMap[codeMap.length - 1]).label
}

export function weatherIcon(code: number): string {
  return (codeMap.find((c) => code <= c.max) ?? codeMap[codeMap.length - 1]).icon
}
