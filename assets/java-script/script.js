// DOM Elements

const inputEl = document.getElementById("user-input");
const submitBtn = document.getElementById("input-submit-btn");
const suggestionBox = document.getElementById("place-suggestion");
const tempEl = document.getElementById("temprature");
const placeEl = document.getElementById("place");
const weatherElsAll = Array.from(
  document.querySelectorAll('[id="weather-code"]'),
);
const windBigEl = document.getElementById("Windspeed");
const humidityBigEl = document.getElementById("Humidity");
const tiles = Array.from(document.querySelectorAll('[id="day"]'));

// API's

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

// Air API

async function fetchAirQuality(lat, lon) {
  const hourly = ["pm2_5", "pm10", "nitrogen_dioxide", "ozone"].join(",");
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=${hourly}&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

// Waves API

async function fetchMarine(lat, lon) {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

// Geo location finding

async function geocodeCity(q) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding failed: " + res.status);
  return res.json();
}

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

function emojiToDataUri(emoji, size = 96) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
    <text y='50%' x='50%' dominant-baseline='middle' text-anchor='middle' font-size='${Math.round(size * 0.6)}'>${emoji}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// UI suggestions

function clearSuggestions() {
  suggestionBox.innerHTML = "";
}

function showSuggestions(results) {
  clearSuggestions();
  if (!results || !results.length) {
    suggestionBox.innerHTML =
      '<div class="p-3 text-sm text-gray-400">No places found</div>';
    return;
  }
  const box = document.createElement("div");
  box.className = "p-2";
  results.forEach((place) => {
    const btn = document.createElement("button");
    btn.className =
      "block w-full text-left px-3 py-2 hover:bg-slate-800 rounded text-white";
    btn.textContent = `${place.name}${place.admin1 ? ", " + place.admin1 : ""}${place.country ? " (" + place.country + ")" : ""}`;
    btn.addEventListener("click", () => {
      clearSuggestions();
      inputEl.value = `${place.name}${place.country ? ", " + place.country : ""}`;
      loadWeatherFor(place.latitude, place.longitude, place);
    });
    box.appendChild(btn);
  });
  suggestionBox.appendChild(box);
}

// search

async function onSearch() {
  const q = inputEl.value.trim();
  if (!q) return alert("Type a city name to search.");

  clearSuggestions();
  suggestionBox.textContent = "Searching...";

  setText(tempEl, "Loading…");
  setText(placeEl, "…");

  try {
    const geo = await geocodeCity(q);
    if (!geo || !geo.results || geo.results.length === 0) {
      suggestionBox.textContent = "No places found.";
      setText(tempEl, "N/A");
      return;
    }
    if (geo.results.length === 1) {
      loadWeatherFor(
        geo.results[0].latitude,
        geo.results[0].longitude,
        geo.results[0],
      );
      clearSuggestions();
    } else {
      showSuggestions(geo.results);
    }
  } catch (err) {
    console.error(err);
    suggestionBox.textContent = "Search failed. Check console.";
    setText(tempEl, "Error");
  }
}

async function loadWeatherFor(lat, lon, placeMeta = {}) {
  setText(
    placeEl,
    `${placeMeta.name ?? "Location"}, ${placeMeta.country ?? ""}`,
  );
  setText(tempEl, "Loading…");
  setText(windBigEl, "Windspeed: —");
  setText(humidityBigEl, "Humidity : —");

  // parallel fetch
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

    // placeholders

    setText(tempEl, curTemp !== null ? `${curTemp} °C` : "N/A");
    setText(
      windBigEl,
      `Windspeed: ${curWind !== null ? curWind + " km/h" : "N/A"}`,
    );
    setText(
      humidityBigEl,
      `Humidity : ${humidity !== null ? humidity + "%" : "N/A"}`,
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

    const tileValues = [
      curTime ? curTime.split("T")[0] : (forecast?.daily?.time?.[0] ?? "N/A"),
      aqiPm25 !== null ? `PM2.5: ${aqiPm25}` : "Air: N/A",
      soil !== null ? `${soil}` : "Moisture: N/A",
      wave !== null ? `${wave} m` : "Wave: N/A",
      uv !== 0 ? `${uv}` : "UV: N/A",
      curWind !== null ? `${curWind} km/h` : "Wind: N/A",
      pressure !== null ? `${pressure} hPa` : "Pressure: N/A",
      visibility !== null ? `${visibility} m` : "Visibility: N/A",
      weatherText,
    ];

    tiles.forEach((tileEl, i) => setText(tileEl, tileValues[i] ?? "—"));
  } catch (err) {
    console.error("Failed to load weather:", err);
    setText(tempEl, "Error");

    tiles.forEach((t, i) => setText(t, i === 0 ? "Error" : "N/A"));
  }
}

submitBtn.addEventListener("click", onSearch);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onSearch();
});

// placeholders

setText(tempEl, "—");
setText(placeEl, "—");
tiles.forEach((t) => setText(t, "—"));
