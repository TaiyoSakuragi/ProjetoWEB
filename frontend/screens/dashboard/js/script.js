import { apiGet, apiGetOrNull, apiPost } from "./modules/api.js";
import { clearToken, ensureAuthenticatedOnLoad, getCurrentUserIdFromToken } from "./modules/auth.js";
import { refs, state, VARIABLE_LABELS, VARIABLE_UNITS } from "./modules/config.js";

ensureAuthenticatedOnLoad();

function formatLocation(location) {
  if (!location) {
    return "Localização não cadastrada para esta estação.";
  }

  const lat = Number(location.latitude);
  const lon = Number(location.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return "Localização inválida para esta estação.";
  }

  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function setMapLinkState() {
  return;
}

function setActiveView(view) {
  const isMap = view === "map";
  const isRegister = view === "register";
  const isData = !isMap && !isRegister;

  refs.viewDataBtn.classList.toggle("active", isData);
  refs.viewMapBtn.classList.toggle("active", isMap);
  refs.viewRegisterBtn.classList.toggle("active", isRegister);
  refs.viewDataBtn.setAttribute("aria-pressed", isData ? "true" : "false");
  refs.viewMapBtn.setAttribute("aria-pressed", isMap ? "true" : "false");
  refs.viewRegisterBtn.setAttribute("aria-pressed", isRegister ? "true" : "false");

  refs.dataPanel.classList.toggle("hidden", !isData);
  refs.mapPanel.classList.toggle("hidden", !isMap);
  refs.registerPanel.classList.toggle("hidden", !isRegister);
  refs.dataControls.classList.toggle("hidden", !isData);
  refs.mapControls.classList.toggle("hidden", !isMap);
  refs.registerControls.classList.toggle("hidden", !isRegister);
  refs.stationMeta.classList.toggle("hidden", !isData);

  refs.summaryGrid.classList.toggle("hidden", !isData);
  if (isData) {
    refs.breadcrumbText.textContent = "Início > Série Histórica";
    refs.pageTitle.textContent = "Análise de Série Histórica por Estação";
    refs.viewContextText.textContent = "Consulte séries históricas por variável, período e estação.";
  } else if (isMap) {
    refs.breadcrumbText.textContent = "Início > Mapa Interativo";
    refs.pageTitle.textContent = "Mapa Interativo de Estações";
    refs.viewContextText.textContent = "Navegue no território e acompanhe as estações por localização.";
  } else {
    refs.breadcrumbText.textContent = "Início > Gestão de Cadastros";
    refs.pageTitle.textContent = "Gestão de Cadastros";
    refs.viewContextText.textContent = "Mantenha a operação atualizada com criação de estações, usuários e localização.";
  }

  if (!isMap) {
    resetMapUiState();
    refs.error.textContent = "";
  }

  if (isData && state.previewMap) {
    setTimeout(() => state.previewMap.invalidateSize(), 0);
  }
}

function setFormMessage(ref, text, type) {
  ref.textContent = text;
  ref.classList.remove("success", "error");
  if (type) {
    ref.classList.add(type);
  }
}

function setSubmitButtonState(form, loading) {
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!submitButton) {
    return;
  }

  const defaultLabel = submitButton.dataset.defaultLabel || submitButton.textContent || "Salvar";
  const loadingLabel = submitButton.dataset.loadingLabel || "Salvando...";

  submitButton.disabled = loading;
  submitButton.textContent = loading ? loadingLabel : defaultLabel;
}

function setMapInsight(name, lat, lon, latestText) {
  refs.mapInsightName.textContent = name || "Detalhes da estação";

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    refs.mapInsightCoords.textContent = `Lat/Lon: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } else {
    refs.mapInsightCoords.textContent = "Lat/Lon: -";
  }

  refs.mapInsightLatest.textContent = latestText || "Último dado: clique em um pin";
}

function resetMapUiState() {
  hideMapInsight();
  setMapInsight("Detalhes da estação", NaN, NaN, "Último dado: clique em um pin");

  if (state.map) {
    state.map.closePopup();
  }
}

function hideMapInsight() {
  refs.mapInsightPanel.classList.add("hidden");
  refs.mapLayout.classList.add("no-insight");
}

function showMapInsight() {
  refs.mapInsightPanel.classList.remove("hidden");
  refs.mapLayout.classList.remove("no-insight");
}

function highlightMapStationInList(stationId) {
  const items = refs.mapStationsList.querySelectorAll(".map-station-item");
  items.forEach((item) => {
    const isSelected = item.dataset.stationId === String(stationId);
    item.classList.toggle("selected", isSelected);
  });
}

function focusStationOnMap(stationId) {
  const marker = state.markerByDeviceId[String(stationId)];
  if (!marker || !state.map) {
    return;
  }

  state.map.panTo(marker.getLatLng());
  marker.openPopup();
}

function renderMapStationsList(stations, selectedStationId) {
  if (!Array.isArray(stations) || stations.length === 0) {
    refs.mapStationsList.innerHTML = '<p class="map-station-meta">Nenhuma estação carregada.</p>';
    return;
  }

  refs.mapStationsList.innerHTML = stations.map((station) => {
    const selected = String(station.id) === String(selectedStationId);
    const meta = station.hasLocation
      ? `${station.lat.toFixed(5)}, ${station.lon.toFixed(5)}`
      : "Sem localização";
    const locationClass = station.hasLocation ? "" : " no-location";

    return `
      <div class="map-station-item${selected ? " selected" : ""}${locationClass}" data-station-id="${station.id}" data-has-location="${station.hasLocation ? "true" : "false"}" role="button" tabindex="0">
        <div class="map-station-head">
          <span class="map-station-number">${station.mapNumber}</span>
          <p class="map-station-name">${station.name}</p>
        </div>
        <p class="map-station-meta">${meta}</p>
      </div>
    `;
  }).join("");
}

function ensureMap() {
  if (state.map) {
    return state.map;
  }

  state.map = L.map(refs.mapContainer).setView([-15.78, -47.93], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(state.map);

  if (typeof L.markerClusterGroup === "function") {
    state.mapMarkersLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true
    });
    state.map.addLayer(state.mapMarkersLayer);
  } else {
    state.mapMarkersLayer = L.layerGroup().addTo(state.map);
  }

  return state.map;
}

function ensurePreviewMap() {
  if (state.previewMap || !refs.previewMapContainer) {
    return state.previewMap;
  }

  state.previewMap = L.map(refs.previewMapContainer, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false,
    touchZoom: false
  }).setView([-15.78, -47.93], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(state.previewMap);

  return state.previewMap;
}

function updatePreviewMap(location, stationName) {
  if (!refs.previewMapContainer || !refs.previewMapEmpty) {
    return;
  }

  const lat = Number(location?.latitude);
  const lon = Number(location?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    refs.previewMapEmpty.classList.remove("hidden");
    if (state.previewMarker && state.previewMap) {
      state.previewMap.removeLayer(state.previewMarker);
      state.previewMarker = null;
    }
    return;
  }

  const previewMap = ensurePreviewMap();
  refs.previewMapEmpty.classList.add("hidden");

  if (state.previewMarker) {
    previewMap.removeLayer(state.previewMarker);
  }

  state.previewMarker = L.marker([lat, lon]).addTo(previewMap);
  state.previewMarker.bindTooltip(stationName || "Estação", {
    permanent: false,
    direction: "top"
  });
  previewMap.setView([lat, lon], 13);
  setTimeout(() => previewMap.invalidateSize(), 0);
}

function markerIcon(isSelected, labelNumber) {
  const className = isSelected ? "station-marker selected" : "station-marker";
  return L.divIcon({
    className: "station-marker-wrapper",
    html: `<div class="${className}">${labelNumber}</div>`,
    iconSize: isSelected ? [28, 28] : [24, 24],
    iconAnchor: isSelected ? [14, 14] : [12, 12]
  });
}

function readingLabel(variable) {
  if (VARIABLE_LABELS[variable]) {
    return VARIABLE_LABELS[variable];
  }
  return variable;
}

function buildPopupHtml(device, lat, lon, readingText, selected, mapNumber) {
  const tag = selected ? '<span class="popup-tag">Selecionada</span>' : "";
  return `
    <div class="popup-card">
      <p class="popup-title">Ponto ${mapNumber} - ${device.name || `Estação ${device.id}`}</p>
      <p class="popup-coords">${lat.toFixed(5)}, ${lon.toFixed(5)}</p>
      <p class="popup-reading">${readingText}</p>
      ${tag}
    </div>
  `;
}

function defaultLatestWindow() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

function pickLatestObservation(observations) {
  if (!Array.isArray(observations) || observations.length === 0) {
    return null;
  }

  let latest = null;
  let latestTs = -Infinity;

  for (const item of observations) {
    const ts = Date.parse(item?.register || "");
    if (Number.isFinite(ts) && ts > latestTs) {
      latestTs = ts;
      latest = item;
    }
  }

  return latest || observations[observations.length - 1];
}

function latestReadingText(latest) {
  if (!latest) {
    return "Última leitura: indisponível";
  }

  const preferredVariable = refs.variableSelect.value;
  const candidates = [
    preferredVariable,
    "air_temperature",
    "air_humidity",
    "air_pressure",
    "wind_speed",
    "wind_direction",
    "rain_accumulated"
  ].filter(Boolean);

  let chosenKey = null;
  for (const key of candidates) {
    const value = Number(latest[key]);
    if (Number.isFinite(value)) {
      chosenKey = key;
      break;
    }
  }

  const dateText = latest.register ? String(latest.register) : "sem data";
  if (!chosenKey) {
    return `Última leitura em ${dateText}: sem valor numérico`;
  }

  return `Última leitura em ${dateText}: ${readingLabel(chosenKey)} ${Number(latest[chosenKey]).toFixed(2)}`;
}

async function getLatestObservationText(deviceId) {
  const key = String(deviceId);
  if (Object.prototype.hasOwnProperty.call(state.latestObservationByDeviceId, key)) {
    return state.latestObservationByDeviceId[key];
  }

  const range = defaultLatestWindow();
  const query = `start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`;
  const observations = await apiGet(`/api/observations/${deviceId}?${query}`);
  const latest = pickLatestObservation(observations);
  const text = latestReadingText(latest);
  state.latestObservationByDeviceId[key] = text;
  return text;
}

async function getLocationForDevice(deviceId) {
  if (Object.prototype.hasOwnProperty.call(state.locationByDeviceId, String(deviceId))) {
    return state.locationByDeviceId[String(deviceId)];
  }

  const location = await apiGetOrNull(`/api/devices/${deviceId}/location/`);
  state.locationByDeviceId[String(deviceId)] = location;
  return location;
}

async function renderStationsMap(selectedStationId) {
  const map = ensureMap();
  state.mapMarkersLayer.clearLayers();
  state.markerByDeviceId = {};
  hideMapInsight();
  setMapInsight("Detalhes da estação", NaN, NaN, "Último dado: clique em um pin");

  const markers = [];
  const stationsForSidebar = [];
  let selectedMarker = null;

  for (const device of state.devices) {
    try {
      const mapNumber = stationsForSidebar.length + 1;
      const location = await getLocationForDevice(device.id);
      const lat = Number(location?.latitude);
      const lon = Number(location?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        stationsForSidebar.push({
          id: device.id,
          name: device.name || `Estação ${device.id}`,
          mapNumber,
          hasLocation: false,
          lat: NaN,
          lon: NaN
        });
        continue;
      }

      stationsForSidebar.push({
        id: device.id,
        name: device.name || `Estação ${device.id}`,
        mapNumber,
        hasLocation: true,
        lat,
        lon
      });

      const selected = String(device.id) === String(selectedStationId);
      const marker = L.marker([lat, lon], { icon: markerIcon(selected, mapNumber) });
      marker.bindPopup(buildPopupHtml(device, lat, lon, "Última leitura: carregando...", selected, mapNumber));
      marker.on("popupopen", async (event) => {
        showMapInsight();
        highlightMapStationInList(device.id);
        setMapInsight(`Ponto ${mapNumber} - ${device.name || `Estação ${device.id}`}`, lat, lon, "Último dado: carregando...");
        try {
          const text = await getLatestObservationText(device.id);
          event.popup.setContent(buildPopupHtml(device, lat, lon, text, selected, mapNumber));
          setMapInsight(`Ponto ${mapNumber} - ${device.name || `Estação ${device.id}`}`, lat, lon, text);
        } catch (error) {
          const failText = "Último dado: erro ao carregar";
          event.popup.setContent(buildPopupHtml(device, lat, lon, failText, selected, mapNumber));
          setMapInsight(`Ponto ${mapNumber} - ${device.name || `Estação ${device.id}`}`, lat, lon, failText);
        }
      });
      marker.addTo(state.mapMarkersLayer);
      markers.push(marker);
      state.markerByDeviceId[String(device.id)] = marker;

      if (String(device.id) === String(selectedStationId)) {
        selectedMarker = marker;
      }
    } catch (error) {
      // Ignore per-device location failure to keep map rendering.
    }
  }

  renderMapStationsList(stationsForSidebar, selectedStationId);

  if (markers.length === 0) {
    refs.error.textContent = "Nenhuma estação com localização válida para exibir no mapa.";
    map.setView([-15.78, -47.93], 4);
    setMapInsight("Sem estações no mapa", NaN, NaN, "Último dado: indisponível");
    showMapInsight();
    return;
  }

  const bounds = L.featureGroup(markers).getBounds();
  map.fitBounds(bounds.pad(0.2));

  if (selectedMarker) {
    selectedMarker.openPopup();
  }
}

async function openMapPanel() {
  setActiveView("map");
  refs.error.textContent = "";
  await renderStationsMap(refs.stationSelect.value);
  setTimeout(() => {
    if (state.map) {
      state.map.invalidateSize();
    }
  }, 0);
}

function closeMapPanel() {
  setActiveView("data");
}

async function updateStationLocation() {
  const stationId = refs.stationSelect.value;
  const stationName = refs.stationSelect.options[refs.stationSelect.selectedIndex]?.text || "Estação";

  if (!stationId) {
    refs.stationLocationText.textContent = "Selecione uma estação para ver a localização.";
    updatePreviewMap(null, null);
    setMapLinkState();
    return;
  }

  if (Object.prototype.hasOwnProperty.call(state.locationByDeviceId, stationId)) {
    const location = state.locationByDeviceId[stationId];
    refs.stationLocationText.textContent = formatLocation(location);
    updatePreviewMap(location, stationName);
    setMapLinkState();
    return;
  }

  refs.stationLocationText.textContent = "Carregando localização...";
  updatePreviewMap(null, null);
  setMapLinkState();

  try {
    const location = await apiGetOrNull(`/api/devices/${stationId}/location/`);
    state.locationByDeviceId[stationId] = location;
    refs.stationLocationText.textContent = formatLocation(location);
    updatePreviewMap(location, stationName);
    setMapLinkState();
  } catch (error) {
    refs.stationLocationText.textContent = "Erro ao carregar localização.";
    updatePreviewMap(null, null);
    setMapLinkState();
  }
}

function summaryItem(label, value, meta, trendClass = "") {
  return `
    <div class="stat-card ${trendClass}">
      <div class="stat-title">${label}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-meta">${meta || "-"}</div>
      <div class="sparkline" style="border-bottom-color: var(--primary-blue);"></div>
    </div>
  `;
}

function metricUnit(variableKey) {
  return VARIABLE_UNITS[variableKey] || "";
}

function formatMetricValue(value, variableKey) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }

  const unit = metricUnit(variableKey);
  return unit ? `${numeric.toFixed(2)} ${unit}` : numeric.toFixed(2);
}

function computeStdDev(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const mean = values.reduce((acc, item) => acc + item, 0) / values.length;
  const variance = values.reduce((acc, item) => acc + ((item - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function formatDisplayDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "-");
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function renderLatestTable(stationName, variableLabel, observations, variableKey) {
  if (!Array.isArray(observations) || observations.length === 0) {
    refs.latestTableBody.innerHTML = `
      <tr>
        <td colspan="3">Nenhuma leitura disponível para os filtros atuais.</td>
      </tr>
    `;
    return;
  }

  const rows = observations.slice(-6).reverse().map((item) => {
    const rawValue = Number(item[variableKey]);
    const displayValue = formatMetricValue(rawValue, variableKey);
    return `
      <tr>
        <td>${variableLabel}</td>
        <td>${displayValue}</td>
        <td>${formatDisplayDateTime(item.register)}</td>
      </tr>
    `;
  }).join("");

  refs.latestTableBody.innerHTML = rows;
}

function renderDefaultTable() {
  refs.latestTableBody.innerHTML = `
    <tr>
      <td colspan="3">Selecione uma estação e clique em Buscar.</td>
    </tr>
  `;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function setDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  refs.startDate.value = formatDate(start);
  refs.endDate.value = formatDate(end);
}

async function loadCurrentUserLabel() {
  const userId = getCurrentUserIdFromToken();
  if (!userId) {
    refs.userMenuBtn.textContent = "Usuário";
    return;
  }

  try {
    const user = await apiGet(`/api/users/${userId}`);
    refs.userMenuBtn.textContent = user?.name || user?.email || "Usuário";
  } catch (error) {
    refs.userMenuBtn.textContent = "Usuário";
  }
}

function fillStations(devices) {
  refs.stationSelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecione uma estação";
  placeholder.disabled = true;
  placeholder.selected = true;
  refs.stationSelect.appendChild(placeholder);

  if (!Array.isArray(devices) || devices.length === 0) {
    placeholder.textContent = "Nenhuma estação";
    refs.registerLocationDevice.innerHTML = "";
    return;
  }

  devices.forEach((device) => {
    const option = document.createElement("option");
    option.value = String(device.id);
    option.textContent = device.name || `Device ${device.id}`;
    refs.stationSelect.appendChild(option);
  });

  refs.registerLocationDevice.innerHTML = "";
  const regPlaceholder = document.createElement("option");
  regPlaceholder.value = "";
  regPlaceholder.textContent = "Selecione uma estação";
  regPlaceholder.disabled = true;
  regPlaceholder.selected = true;
  refs.registerLocationDevice.appendChild(regPlaceholder);

  devices.forEach((device) => {
    const option = document.createElement("option");
    option.value = String(device.id);
    option.textContent = device.name || `Device ${device.id}`;
    refs.registerLocationDevice.appendChild(option);
  });
}

function updateSearchButtonState() {
  const hasStation = Boolean(refs.stationSelect.value);
  const hasVariable = Boolean(refs.variableSelect.value);
  const hasStart = Boolean(refs.startDate.value);
  const hasEnd = Boolean(refs.endDate.value);
  refs.searchBtn.disabled = !(hasStation && hasVariable && hasStart && hasEnd);
}

function setChartEmptyState(visible, message) {
  if (!refs.chartEmptyState) {
    return;
  }

  refs.chartEmptyState.textContent = message || "Selecione uma estação, um período e uma variável para visualizar o gráfico.";
  refs.chartEmptyState.classList.toggle("hidden", !visible);
  refs.chartCanvas.style.opacity = visible ? "0.2" : "1";
}

function buildChart(labels, values, variableLabel) {
  if (state.chart) {
    state.chart.destroy();
  }

  setChartEmptyState(labels.length === 0, labels.length === 0
    ? "Nenhum dado disponível para os filtros selecionados."
    : "");

  state.chart = new Chart(refs.chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: variableLabel,
          data: values,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.16)",
          borderWidth: 2,
          fill: true,
          tension: 0.25,
          pointRadius: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8
          }
        },
        y: {
          beginAtZero: false
        }
      },
      plugins: {
        legend: {
          display: true
        }
      }
    }
  });
}

function buildSummaries(values, observations = [], variableKey = "") {
  if (values.length === 0) {
    refs.summaryGrid.innerHTML = "";
    return;
  }

  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) {
    refs.summaryGrid.innerHTML = summaryItem("Registros", String(values.length), "Nenhum valor numérico válido no período.");
    return;
  }

  const total = values.length;
  const coverage = total > 0 ? ((valid.length / total) * 100) : 0;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const avg = valid.reduce((acc, v) => acc + v, 0) / valid.length;
  const last = valid[valid.length - 1];
  const previous = valid.length > 1 ? valid[valid.length - 2] : null;
  const delta = Number.isFinite(previous) ? (last - previous) : null;
  const stdDev = computeStdDev(valid);
  const range = max - min;
  const lastRegister = observations[observations.length - 1]?.register;
  const lastText = lastRegister ? formatDisplayDateTime(lastRegister) : "sem horário";
  const trendClass = delta === null ? "" : (delta >= 0 ? "trend-up" : "trend-down");
  const deltaValue = delta === null ? "" : formatMetricValue(Math.abs(delta), variableKey);
  const deltaText = delta === null ? "Sem dado anterior" : `${delta >= 0 ? "↑" : "↓"} ${deltaValue} vs anterior`;

  refs.summaryGrid.innerHTML = [
    summaryItem("Registros", `${valid.length}/${total}`, `Cobertura ${coverage.toFixed(0)}%`),
    summaryItem("Mínimo", formatMetricValue(min, variableKey), `Faixa até o máximo: ${formatMetricValue(range, variableKey)}`),
    summaryItem("Máximo", formatMetricValue(max, variableKey), `Acima da média: ${formatMetricValue(max - avg, variableKey)}`),
    summaryItem("Média", formatMetricValue(avg, variableKey), `Desvio padrão: ${formatMetricValue(stdDev, variableKey)}`),
    summaryItem("Último", formatMetricValue(last, variableKey), `${deltaText} • ${lastText}`, trendClass)
  ].join("");
}

async function loadStations() {
  refs.error.textContent = "";

  const devices = await apiGet("/api/devices/");
  state.devices = Array.isArray(devices) ? devices : [];
  fillStations(state.devices);
  await preloadKnownLocations();
  updateSearchButtonState();
}

async function preloadKnownLocations() {
  await Promise.all(state.devices.map(async (device) => {
    try {
      await getLocationForDevice(device.id);
    } catch (error) {
      // Ignore preloading errors.
    }
  }));
}

async function searchSeries() {
  refs.error.textContent = "";

  const stationId = refs.stationSelect.value;
  const variable = refs.variableSelect.value;
  const start = refs.startDate.value;
  const end = refs.endDate.value;

  if (!stationId || !variable || !start || !end) {
    refs.error.textContent = "Preencha estação, variável e período.";
    return;
  }

  try {
    const query = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    const observations = await apiGet(`/api/observations/${stationId}?${query}`);

    if (!Array.isArray(observations) || observations.length === 0) {
      refs.error.textContent = "Nenhum dado encontrado para os filtros informados.";
      buildChart([], [], VARIABLE_LABELS[variable] || variable);
      refs.summaryGrid.innerHTML = "";
      renderLatestTable("-", VARIABLE_LABELS[variable] || variable, [], variable);
      return;
    }

    const labels = observations.map((item) => String(item.register || ""));
    const values = observations.map((item) => Number(item[variable]));
    const stationName = refs.stationSelect.options[refs.stationSelect.selectedIndex]?.text || `Estação ${stationId}`;
    const variableLabel = VARIABLE_LABELS[variable] || variable;

    refs.chartTitle.textContent = `${stationName} - ${variableLabel}`;
    refs.chartSubtitle.textContent = `${start} até ${end}`;
    state.currentObservations = observations;

    buildChart(labels, values, variableLabel);
    buildSummaries(values, observations, variable);
    renderLatestTable(stationName, variableLabel, observations, variable);
  } catch (error) {
    refs.error.textContent = error.message;
  }
}

refs.searchBtn.addEventListener("click", searchSeries);
refs.refreshBtn.addEventListener("click", async () => {
  try {
    await loadStations();
    if (!refs.mapPanel.classList.contains("hidden")) {
      await renderStationsMap(refs.stationSelect.value);
    }
  } catch (error) {
    refs.error.textContent = error.message;
  }
});

refs.viewMapBtn.addEventListener("click", async () => {
  try {
    await openMapPanel();
  } catch (error) {
    refs.error.textContent = error.message;
  }
});

refs.viewDataBtn.addEventListener("click", () => {
  setActiveView("data");
});

refs.viewRegisterBtn.addEventListener("click", () => {
  setActiveView("register");
});

refs.logoutBtn.addEventListener("click", () => {
  clearToken();
  localStorage.clear();
  window.location.replace("../login/index.html");
});

if (refs.userMenuBtn && refs.userMenuPanel) {
  refs.userMenuBtn.addEventListener("click", () => {
    refs.userMenuPanel.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".user-menu-wrapper")) {
      refs.userMenuPanel.classList.add("hidden");
    }
  });
}

refs.stationSelect.addEventListener("change", updateSearchButtonState);
refs.stationSelect.addEventListener("change", updateStationLocation);
refs.stationSelect.addEventListener("change", async () => {
  if (!refs.mapPanel.classList.contains("hidden")) {
    await renderStationsMap(refs.stationSelect.value);
  }
});

refs.mapStationsList.addEventListener("click", (event) => {
  const item = event.target.closest(".map-station-item");
  if (!item) {
    return;
  }

  const stationId = item.dataset.stationId;
  const hasLocation = item.dataset.hasLocation === "true";
  highlightMapStationInList(stationId);

  if (!hasLocation) {
    showMapInsight();
    setMapInsight(item.querySelector(".map-station-name")?.textContent || "Detalhes da estação", NaN, NaN, "Último dado: indisponível (sem localização)");
    return;
  }

  focusStationOnMap(stationId);
});

refs.mapStationsList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  const item = event.target.closest(".map-station-item");
  if (!item) {
    return;
  }
  event.preventDefault();
  item.click();
});

refs.registerDeviceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormMessage(refs.registerDeviceMsg, "", null);
  setSubmitButtonState(refs.registerDeviceForm, true);

  const name = refs.registerDeviceName.value.trim();
  if (!name) {
    setFormMessage(refs.registerDeviceMsg, "Informe o nome da estação.", "error");
    setSubmitButtonState(refs.registerDeviceForm, false);
    return;
  }

  try {
    await apiPost("/api/devices/", { name });
    setFormMessage(refs.registerDeviceMsg, "Estação criada com sucesso.", "success");
    refs.registerDeviceForm.reset();
    await loadStations();
  } catch (error) {
    setFormMessage(refs.registerDeviceMsg, error.message, "error");
  } finally {
    setSubmitButtonState(refs.registerDeviceForm, false);
  }
});

refs.registerLocationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormMessage(refs.registerLocationMsg, "", null);
  setSubmitButtonState(refs.registerLocationForm, true);

  const deviceId = refs.registerLocationDevice.value;
  const latitude = Number(refs.registerLocationLat.value);
  const longitude = Number(refs.registerLocationLon.value);

  if (!deviceId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    setFormMessage(refs.registerLocationMsg, "Preencha estação, latitude e longitude válidas.", "error");
    setSubmitButtonState(refs.registerLocationForm, false);
    return;
  }

  try {
    await apiPost(`/api/devices/${deviceId}/location/`, { latitude, longitude });
    state.locationByDeviceId[String(deviceId)] = { latitude, longitude };
    setFormMessage(refs.registerLocationMsg, "Localização salva com sucesso.", "success");
    refs.registerLocationLat.value = "";
    refs.registerLocationLon.value = "";
    await updateStationLocation();
  } catch (error) {
    setFormMessage(refs.registerLocationMsg, error.message, "error");
  } finally {
    setSubmitButtonState(refs.registerLocationForm, false);
  }
});

refs.registerUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormMessage(refs.registerUserMsg, "", null);
  setSubmitButtonState(refs.registerUserForm, true);

  const name = refs.registerUserName.value.trim();
  const email = refs.registerUserEmail.value.trim();
  const password = refs.registerUserPassword.value;

  if (!name || !email || !password) {
    setFormMessage(refs.registerUserMsg, "Preencha nome, e-mail e senha.", "error");
    setSubmitButtonState(refs.registerUserForm, false);
    return;
  }

  try {
    await apiPost("/api/users/", { name, email, password });
    setFormMessage(refs.registerUserMsg, "Usuário criado com sucesso.", "success");
    refs.registerUserForm.reset();
  } catch (error) {
    setFormMessage(refs.registerUserMsg, error.message, "error");
  } finally {
    setSubmitButtonState(refs.registerUserForm, false);
  }
});
refs.variableSelect.addEventListener("change", updateSearchButtonState);
refs.startDate.addEventListener("change", updateSearchButtonState);
refs.endDate.addEventListener("change", updateSearchButtonState);

(async function init() {
  setDefaultDateRange();
  renderDefaultTable();
  updatePreviewMap(null, null);
  setChartEmptyState(true, "Selecione uma estação, um período e uma variável para visualizar o gráfico.");
  updateSearchButtonState();
  setActiveView("data");

  try {
    await loadCurrentUserLabel();
    await loadStations();
  } catch (error) {
    refs.error.textContent = error.message;
  }
})();
