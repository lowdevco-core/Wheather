const inputEl      = document.getElementById("user-input");
const submitBtn    = document.getElementById("input-submit-btn");
const suggestionBox= document.getElementById("place-suggestion");
const toastContainer = document.getElementById("toast-container");

const temperatureEl = document.getElementById("temperature");
const placeEl       = document.getElementById("place");
const conditionEl   = document.getElementById("condition");
const heroDateEl    = document.getElementById("hero-date");
const windSpeedEl   = document.getElementById("wind-speed");
const humidityEl    = document.getElementById("humidity");
const sunriseEl     = document.getElementById("sunrise");
const sunsetEl      = document.getElementById("sunset");
const heroIconWrap  = document.getElementById("hero-icon-wrap");

const mAir       = document.getElementById("m-air");
const mUv        = document.getElementById("m-uv");
const mPressure  = document.getElementById("m-pressure");
const mVisibility= document.getElementById("m-visibility");
const mMoisture  = document.getElementById("m-moisture");
const mWave      = document.getElementById("m-wave");
const mFeels     = document.getElementById("m-feels");
const mWindDir   = document.getElementById("m-wind-dir");

const hourlyScroll = document.getElementById("hourly-scroll");
const dailyGrid    = document.getElementById("daily-grid");

const WMO_TEXT = {
  0:  "Clear sky",
  1:  "Mainly clear",
  2:  "Partly cloudy",
  3:  "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Moderate showers",
  82: "Violent showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm + hail",
  99: "Thunderstorm + heavy hail",
};

function wmoText(code) {
  return WMO_TEXT[code] ?? "Unknown";
}

function wmoLucideIcon(code) {
  if (code === 0)                             return "sun";
  if (code >= 1 && code <= 2)                return "cloud-sun";
  if (code === 3)                             return "cloud";
  if (code === 45 || code === 48)            return "cloud-fog";
  if (code >= 51 && code <= 55)              return "cloud-drizzle";
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return "cloud-rain-wind";
  if ((code >= 71 && code <= 75) || code === 85 || code === 86) return "snowflake";
  if (code === 95 || code === 96 || code === 99) return "cloud-lightning";
  return "cloud-sun";
}

function wmoIconColor(code) {
  if (code === 0)                             return "#FBBF24";
  if (code >= 1 && code <= 2)                return "#FCD34D";
  if (code === 3)                             return "#94A3B8";
  if (code === 45 || code === 48)            return "#94A3B8";
  if (code >= 51 && code <= 55)              return "#38BDF8";
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return "#60A5FA";
  if ((code >= 71 && code <= 75) || code === 85 || code === 86) return "#A5B4FC";
  if (code === 95 || code === 96 || code === 99) return "#FBBF24";
  return "#94A3B8";
}

function ambientClass(code, isNight) {
  if (code === 0 || code === 1) return isNight ? "clear-night" : "clear-day";
  if (code === 3 || code === 45 || code === 48) return "rainy";
  if ((code >= 51 && code <= 82) || code === 95 || code === 96 || code === 99) return "rainy";
  if (code >= 71 && code <= 86) return "snowy";
  return isNight ? "clear-night" : "clear-day";
}

function buildLucideEl(iconName, classes, color) {
  const el = document.createElement("i");
  el.setAttribute("data-lucide", iconName);
  if (classes) el.className = classes;
  if (color)   el.style.color = color;
  return el;
}

function setHeroIcon(code) {
  const iconName = wmoLucideIcon(code);
  const color    = wmoIconColor(code);
  heroIconWrap.innerHTML = "";
  const i = buildLucideEl(iconName, "hero-lucide-icon", color);
  heroIconWrap.appendChild(i);
  if (window.lucide) lucide.createIcons({ elements: [i] });
}

function setAmbient(code, isNight) {
  document.body.className = ambientClass(code, isNight);
}

function setText(el, val) {
  if (el) el.textContent = val;
}

function formatTime(isoString) {
  if (!isoString) return "--";
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoString) {
  if (!isoString) return "--";
  const d = new Date(isoString + "T00:00:00");
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function formatHour(isoString) {
  if (!isoString) return "--";
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayShort(isoString) {
  if (!isoString) return "--";
  const d = new Date(isoString + "T12:00:00");
  return d.toLocaleDateString([], { weekday: "short" });
}

function windDegToCompass(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function uvLabel(uv) {
  if (uv === null || uv === undefined) return "--";
  if (uv <= 2)  return `${uv} Low`;
  if (uv <= 5)  return `${uv} Moderate`;
  if (uv <= 7)  return `${uv} High`;
  if (uv <= 10) return `${uv} Very High`;
  return `${uv} Extreme`;
}

function aqiLabel(pm25) {
  if (pm25 === null || pm25 === undefined) return "--";
  if (pm25 <= 12)  return `${pm25.toFixed(1)} Good`;
  if (pm25 <= 35)  return `${pm25.toFixed(1)} Moderate`;
  if (pm25 <= 55)  return `${pm25.toFixed(1)} Unhealthy`;
  return `${pm25.toFixed(1)} Hazardous`;
}

function showToast(message, type = "info", duration = 3500) {
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = message;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add("toast-exit");
    t.addEventListener("animationend", () => t.remove());
  }, duration);
}

async function geocodeCity(q) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en`);
  if (!res.ok) throw new Error("Geocoding failed: " + res.status);
  return res.json();
}

async function fetchForecast(lat, lon) {
  const hourly = [
    "temperature_2m", "apparent_temperature", "relative_humidity_2m",
    "pressure_msl", "visibility", "uv_index", "precipitation",
    "weathercode", "wind_speed_10m", "wind_direction_10m",
    "soil_moisture_0_to_1cm"
  ].join(",");
  const daily = [
    "weathercode", "temperature_2m_max", "temperature_2m_min",
    "sunrise", "sunset", "uv_index_max", "precipitation_sum"
  ].join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourly}&daily=${daily}&current_weather=true&timezone=auto&forecast_days=7`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Forecast failed: " + r.status);
  return r.json();
}

async function fetchAirQuality(lat, lon) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

async function fetchMarine(lat, lon) {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

function clearSuggestions() {
  suggestionBox.innerHTML = "";
}

function showSuggestions(results) {
  clearSuggestions();
  if (!results || !results.length) {
    const msg = document.createElement("div");
    msg.className = "no-results";
    msg.textContent = "No places found";
    suggestionBox.appendChild(msg);
    return;
  }
  results.forEach((place) => {
    const btn = document.createElement("button");
    btn.className = "suggestion-item";
    const region = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
    btn.textContent = region;
    btn.addEventListener("click", () => {
      clearSuggestions();
      inputEl.value = place.name + (place.country ? ", " + place.country : "");
      loadWeatherFor(place.latitude, place.longitude, place);
    });
    suggestionBox.appendChild(btn);
  });
}

async function onSearch() {
  const q = inputEl.value.trim();
  if (!q) {
    showToast("Type a city name to search.", "warning");
    return;
  }
  clearSuggestions();
  const loading = document.createElement("div");
  loading.className = "loading-text";
  loading.textContent = "Searching...";
  suggestionBox.appendChild(loading);

  try {
    const geo = await geocodeCity(q);
    if (!geo?.results?.length) {
      clearSuggestions();
      const msg = document.createElement("div");
      msg.className = "no-results";
      msg.textContent = "No places found.";
      suggestionBox.appendChild(msg);
      return;
    }
    if (geo.results.length === 1) {
      clearSuggestions();
      loadWeatherFor(geo.results[0].latitude, geo.results[0].longitude, geo.results[0]);
    } else {
      showSuggestions(geo.results);
    }
  } catch (err) {
    console.error(err);
    clearSuggestions();
    showToast("Search failed. Please try again.", "error");
  }
}

function buildHourlyForecast(hourly, currentIdx) {
  hourlyScroll.innerHTML = "";
  const startIdx = Math.max(0, currentIdx - 1);
  const endIdx   = Math.min(hourly.time.length, startIdx + 24);

  for (let i = startIdx; i < endIdx; i++) {
    const card = document.createElement("div");
    card.className = "hourly-card" + (i === currentIdx ? " current-hour" : "");

    const code  = hourly.weathercode?.[i] ?? 0;
    const temp  = hourly.temperature_2m?.[i];
    const precip= hourly.precipitation?.[i];

    const timeEl = document.createElement("span");
    timeEl.className = "hourly-time";
    timeEl.textContent = i === currentIdx ? "Now" : formatHour(hourly.time[i]);

    const icon = buildLucideEl(wmoLucideIcon(code), "hourly-icon", wmoIconColor(code));

    const tempEl2 = document.createElement("span");
    tempEl2.className = "hourly-temp";
    tempEl2.textContent = temp !== undefined ? `${Math.round(temp)}°` : "--";

    const precipEl = document.createElement("span");
    precipEl.className = "hourly-precip";
    precipEl.textContent = precip !== undefined && precip > 0 ? `${precip.toFixed(1)} mm` : "";

    card.append(timeEl, icon, tempEl2, precipEl);
    hourlyScroll.appendChild(card);
  }

  if (window.lucide) lucide.createIcons({ elements: Array.from(hourlyScroll.querySelectorAll("[data-lucide]")) });
}

function buildDailyForecast(daily, todayDateStr) {
  dailyGrid.innerHTML = "";
  const count = Math.min(daily.time?.length ?? 0, 7);

  for (let i = 0; i < count; i++) {
    const card = document.createElement("div");
    card.className = "daily-card" + (daily.time[i] === todayDateStr ? " today" : "");

    const code   = daily.weathercode?.[i] ?? 0;
    const high   = daily.temperature_2m_max?.[i];
    const low    = daily.temperature_2m_min?.[i];
    const label  = i === 0 ? "Today" : formatDayShort(daily.time[i]);

    const dayEl = document.createElement("span");
    dayEl.className = "daily-day";
    dayEl.textContent = label;

    const icon = buildLucideEl(wmoLucideIcon(code), "daily-icon", wmoIconColor(code));

    const tempsWrap = document.createElement("div");
    tempsWrap.className = "daily-temps";

    const highEl = document.createElement("span");
    highEl.className = "daily-temp-high";
    highEl.textContent = high !== undefined ? `${Math.round(high)}°` : "--";

    const lowEl = document.createElement("span");
    lowEl.className = "daily-temp-low";
    lowEl.textContent = low !== undefined ? `${Math.round(low)}°` : "--";

    tempsWrap.append(highEl, lowEl);

    const condEl = document.createElement("span");
    condEl.className = "daily-condition";
    condEl.textContent = wmoText(code);

    card.append(dayEl, icon, tempsWrap, condEl);
    dailyGrid.appendChild(card);
  }

  if (window.lucide) lucide.createIcons({ elements: Array.from(dailyGrid.querySelectorAll("[data-lucide]")) });
}

async function loadWeatherFor(lat, lon, placeMeta = {}) {
  setText(placeEl, [placeMeta.name, placeMeta.country].filter(Boolean).join(", ") || "Location");
  setText(temperatureEl, "...");

  try {
    const [forecast, air, marine] = await Promise.all([
      fetchForecast(lat, lon).catch((e) => { console.warn(e); return null; }),
      fetchAirQuality(lat, lon).catch((e) => { console.warn(e); return null; }),
      fetchMarine(lat, lon).catch((e) => { console.warn(e); return null; }),
    ]);

    const cw      = forecast?.current_weather ?? {};
    const hourly  = forecast?.hourly ?? {};
    const daily   = forecast?.daily ?? {};

    const curTemp  = cw.temperature !== undefined ? cw.temperature : (hourly.temperature_2m?.[0] ?? null);
    const curWind  = cw.windspeed   !== undefined ? cw.windspeed   : (hourly.wind_speed_10m?.[0] ?? null);
    const curCode  = cw.weathercode !== undefined ? cw.weathercode : (hourly.weathercode?.[0] ?? null);
    const curTime  = cw.time ?? hourly.time?.[0] ?? null;
    const isNight  = cw.is_day === 0;

    let idx = 0;
    if (curTime && hourly.time) {
      const found = hourly.time.indexOf(curTime);
      if (found !== -1) idx = found;
    }

    const humidity   = hourly.relative_humidity_2m?.[idx] ?? null;
    const pressure   = hourly.pressure_msl?.[idx] ?? null;
    const visibility = hourly.visibility?.[idx] ?? null;
    const uv         = hourly.uv_index?.[idx] ?? daily.uv_index_max?.[0] ?? null;
    const soil       = hourly.soil_moisture_0_to_1cm?.[idx] ?? null;
    const feelsLike  = hourly.apparent_temperature?.[idx] ?? null;
    const windDeg    = hourly.wind_direction_10m?.[idx] ?? null;
    const wave       = marine?.hourly?.wave_height?.[0] ?? null;
    const pm25       = air?.hourly?.pm2_5?.[0] ?? null;

    const todayStr   = daily.time?.[0] ?? null;
    const sunriseStr = daily.sunrise?.[0] ?? null;
    const sunsetStr  = daily.sunset?.[0] ?? null;

    setText(temperatureEl, curTemp !== null ? `${Math.round(curTemp)} °C` : "N/A");
    setText(conditionEl,   wmoText(curCode));
    setText(heroDateEl,    todayStr ? formatDate(todayStr) : "--");
    setText(windSpeedEl,   curWind !== null ? `${curWind} km/h` : "--");
    setText(humidityEl,    humidity !== null ? `${humidity}%` : "--");
    setText(sunriseEl,     sunriseStr ? formatTime(sunriseStr) : "--");
    setText(sunsetEl,      sunsetStr  ? formatTime(sunsetStr)  : "--");

    setHeroIcon(curCode);
    setAmbient(curCode, isNight);

    setText(mAir,        aqiLabel(pm25));
    setText(mUv,         uvLabel(uv));
    setText(mPressure,   pressure   !== null ? `${Math.round(pressure)} hPa`     : "--");
    setText(mVisibility, visibility !== null ? `${(visibility / 1000).toFixed(1)} km` : "--");
    setText(mMoisture,   soil       !== null ? `${(soil * 100).toFixed(0)}%`     : "--");
    setText(mWave,       wave       !== null ? `${wave} m`                        : "--");
    setText(mFeels,      feelsLike  !== null ? `${Math.round(feelsLike)} °C`     : "--");
    setText(mWindDir,    windDeg    !== null ? windDegToCompass(windDeg)          : "--");

    if (hourly.time?.length) buildHourlyForecast(hourly, idx);
    if (daily.time?.length)  buildDailyForecast(daily, todayStr);

  } catch (err) {
    console.error("Failed to load weather:", err);
    showToast("Failed to load weather data.", "error");
    setText(temperatureEl, "Error");
  }
}

submitBtn.addEventListener("click", onSearch);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onSearch();
});

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
});
