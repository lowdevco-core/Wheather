// DOM references
const inputEl = document.getElementById("user-input");
const submitBtn = document.getElementById("input-submit-btn");
const suggestionBox = document.getElementById("place-suggestion");
const tempEl = document.getElementById("temprature");
const placeEl = document.getElementById("place");
const weatherElsAll = Array.from(
  document.querySelectorAll(".weather-update-field")
);
const windBigEl = document.getElementById("Windspeed");
const humidityBigEl = document.getElementById("Humidity");
const tiles = Array.from(document.querySelectorAll(".metric-value"));
const toastContainer = document.getElementById("toast-container");

// Toast notification system — replaces native alert()
function showToast(message, type = "info", duration = 3500) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-exit");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

// Weather forecast API
async function fetchForecast(lat, lon) {
  const hourly = [
    "temperature_2m",
    "relative_humidity_2m",
    "pressure_msl",
    "visibility",
    "uv_index",
    "precipitation",
    "weathercode",
    "wind_speed_10m",
    "wind_direction_10m",
    "soil_moisture_0_to_1cm",
  ].join(",");
  const daily = ["sunrise", "sunset", "uv_index_max", "weathercode"].join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourly}&daily=${daily}&current_weather=true&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Forecast failed: " + r.status);
  return r.json();
}

// Air quality API
async function fetchAirQuality(lat, lon) {
  const hourly = ["pm2_5", "pm10", "nitrogen_dioxide", "ozone"].join(",");
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=${hourly}&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

// Marine / wave API
async function fetchMarine(lat, lon) {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

// Geocoding API
async function geocodeCity(q) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed: " + res.status);
  return res.json();
}

// Weather code → human-readable text
function weatherCodeToText(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] || "Unknown";
}

// Weather code → emoji
function weatherCodeToEmoji(code) {
  if (code === 0) return "☀️";
  if (code >= 1 && code <= 3) return "⛅";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return " 🌧️";
  if ([71, 73, 75, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌤️";
}

function setText(el, value) {
  if (!el) return;
  el.textContent = value;
}

// Convert emoji to SVG data URI for img src
function emojiToDataUri(emoji, size = 96) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
    <text y='50%' x='50%' dominant-baseline='middle' text-anchor='middle' font-size='${Math.round(size * 0.6)}'>${emoji}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// Clear suggestion list
function clearSuggestions() {
  suggestionBox.innerHTML = "";
}

// Render suggestion buttons
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
    btn.textContent = `${place.name}${place.admin1 ? ", " + place.admin1 : ""}${place.country ? " (" + place.country + ")" : ""}`;
    btn.addEventListener("click", () => {
      clearSuggestions();
      inputEl.value = `${place.name}${place.country ? ", " + place.country : ""}`;
      loadWeatherFor(place.latitude, place.longitude, place);
    });
    suggestionBox.appendChild(btn);
  });
}

// Search handler — toast instead of alert
async function onSearch() {
  const q = inputEl.value.trim();

  if (!q) {
    showToast("Type a city name to search.", "warning");
    return;
  }

  clearSuggestions();
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "loading-text";
  loadingMsg.textContent = "Searching…";
  suggestionBox.appendChild(loadingMsg);

  setText(tempEl, "Loading…");
  setText(placeEl, "…");

  try {
    const geo = await geocodeCity(q);

    if (!geo || !geo.results || geo.results.length === 0) {
      clearSuggestions();
      const msg = document.createElement("div");
      msg.className = "no-results";
      msg.textContent = "No places found.";
      suggestionBox.appendChild(msg);
      setText(tempEl, "N/A");
      return;
    }

    if (geo.results.length === 1) {
      loadWeatherFor(
        geo.results[0].latitude,
        geo.results[0].longitude,
        geo.results[0]
      );
      clearSuggestions();
    } else {
      showSuggestions(geo.results);
    }
  } catch (err) {
    console.error(err);
    clearSuggestions();
    showToast("Search failed. Please try again.", "error");
    setText(tempEl, "Error");
  }
}

// Load weather data and populate the UI
async function loadWeatherFor(lat, lon, placeMeta = {}) {
  setText(
    placeEl,
    `${placeMeta.name ?? "Location"}, ${placeMeta.country ?? ""}`
  );
  setText(tempEl, "Loading…");
  setText(windBigEl, "Wind: —");
  setText(humidityBigEl, "Humidity: —");

  try {
    const [forecast, air, marine] = await Promise.all([
      fetchForecast(lat, lon).catch((e) => {
        console.warn(e);
        return null;
      }),
      fetchAirQuality(lat, lon).catch((e) => {
        console.warn(e);
        return null;
      }),
      fetchMarine(lat, lon).catch((e) => {
        console.warn(e);
        return null;
      }),
    ]);

    const cw = forecast?.current_weather || {};
    const curTemp =
      cw.temperature !== undefined
        ? cw.temperature
        : (forecast?.hourly?.temperature_2m?.[0] ?? null);
    const curWind =
      cw.windspeed !== undefined
        ? cw.windspeed
        : (forecast?.hourly?.wind_speed_10m?.[0] ?? null);
    const curCode =
      cw.weathercode !== undefined
        ? cw.weathercode
        : (forecast?.hourly?.weathercode?.[0] ?? null);
    const curTime = cw.time ?? forecast?.hourly?.time?.[0] ?? null;

    let idx = 0;
    if (curTime && forecast?.hourly?.time) {
      idx = forecast.hourly.time.indexOf(curTime);
      if (idx === -1) idx = 0;
    }

    const humidity = forecast?.hourly?.relative_humidity_2m?.[idx] ?? null;
    const pressure = forecast?.hourly?.pressure_msl?.[idx] ?? null;
    const visibility = forecast?.hourly?.visibility?.[idx] ?? null;
    const uv =
      forecast?.hourly?.uv_index?.[idx] ??
      forecast?.daily?.uv_index_max?.[0] ??
      null;
    const soil = forecast?.hourly?.soil_moisture_0_to_1cm?.[idx] ?? null;
    const wave = marine?.hourly?.wave_height?.[0] ?? null;
    const aqiPm25 = air?.hourly?.pm2_5?.[0] ?? null;

    // Update hero section
    setText(tempEl, curTemp !== null ? `${curTemp} °C` : "N/A");
    setText(
      windBigEl,
      `Wind: ${curWind !== null ? curWind + " km/h" : "N/A"}`
    );
    setText(
      humidityBigEl,
      `Humidity: ${humidity !== null ? humidity + "%" : "N/A"}`
    );

    const weatherText = weatherCodeToText(curCode);

    weatherElsAll.forEach((el) => {
      if (el.tagName.toLowerCase() === "img") {
        el.src = emojiToDataUri(weatherCodeToEmoji(curCode), 64);
        el.alt = weatherText;
      } else {
        setText(el, weatherText);
      }
    });

    // Update metric tiles
    const tileValues = [
      curTime ? curTime.split("T")[0] : (forecast?.daily?.time?.[0] ?? "N/A"),
      aqiPm25 !== null ? `PM2.5: ${aqiPm25}` : "N/A",
      soil !== null ? `${soil}` : "N/A",
      wave !== null ? `${wave} m` : "N/A",
      uv !== 0 ? `${uv}` : "N/A",
      curWind !== null ? `${curWind} km/h` : "N/A",
      pressure !== null ? `${pressure} hPa` : "N/A",
      visibility !== null ? `${visibility} m` : "N/A",
      weatherText,
    ];

    tiles.forEach((tileEl, i) => setText(tileEl, tileValues[i] ?? "—"));
  } catch (err) {
    console.error("Failed to load weather:", err);
    showToast("Failed to load weather data.", "error");
    setText(tempEl, "Error");
    tiles.forEach((t, i) => setText(t, i === 0 ? "Error" : "N/A"));
  }
}

// Event listeners
submitBtn.addEventListener("click", onSearch);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onSearch();
});

// Initial placeholder state
setText(tempEl, "—");
setText(placeEl, "—");
tiles.forEach((t) => setText(t, "—"));
