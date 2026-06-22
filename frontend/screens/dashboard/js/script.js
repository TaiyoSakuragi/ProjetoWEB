import { apiGet, apiGetOrNull, apiPost, apiPostRaw } from "./modules/api.js";
import { clearToken, ensureAuthenticatedOnLoad, getCurrentUserIdFromToken, parseJwtPayload } from "./modules/auth.js";
import { refs, state, VARIABLE_LABELS, VARIABLE_UNITS } from "./modules/config.js";

ensureAuthenticatedOnLoad();

const DOWNLOAD_PDF_BUTTON_HTML = '<svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3a1 1 0 0 1 1 1v8.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 3.98a1 1 0 0 1-1.4 0l-4-3.98a1 1 0 1 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" /></svg>Download PDF';
const DOWNLOAD_LOGS_BUTTON_LABEL = "⬇️ Baixar logs";
const REPORT_VARIABLE_KEYS = [
  "air_temperature",
  "air_humidity",
  "air_pressure",
  "wind_speed",
  "wind_direction",
  "rain_accumulated"
];

let ingestPreviewState = null;

function setDownloadPdfButtonLoading(loading) {
  refs.downloadPdfBtn.disabled = loading;
  refs.downloadPdfBtn.innerHTML = loading ? "Gerando PDF..." : DOWNLOAD_PDF_BUTTON_HTML;
}

function formatLocation(location) {
  const normalized = normalizeLocationShape(location);
  if (!normalized) {
    return "Localização não cadastrada para esta estação.";
  }

  const lat = Number(normalized.latitude);
  const lon = Number(normalized.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return "Localização inválida para esta estação.";
  }

  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function normalizeLocationShape(source) {
  if (!source) {
    return null;
  }

  if (typeof source === "string") {
    const trimmed = source.trim();
    const pointMatch = trimmed.match(/POINT\s*\(\s*(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s*\)/i);
    if (pointMatch) {
      return {
        latitude: pointMatch[2].replace(",", "."),
        longitude: pointMatch[1].replace(",", ".")
      };
    }

    const csvMatch = trimmed.match(/^\s*(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)\s*$/);
    if (csvMatch) {
      return {
        latitude: csvMatch[1].replace(",", "."),
        longitude: csvMatch[2].replace(",", ".")
      };
    }

    return null;
  }

  if (Array.isArray(source) && source.length >= 2) {
    return {
      latitude: source[1],
      longitude: source[0]
    };
  }

  if (typeof source !== "object") {
    return null;
  }

  const directLat = source.latitude ?? source.lat ?? source.y;
  const directLon = source.longitude ?? source.lon ?? source.lng ?? source.x;
  if (directLat !== undefined && directLon !== undefined) {
    return {
      latitude: directLat,
      longitude: directLon
    };
  }

  if (source.location && typeof source.location === "object") {
    const nested = normalizeLocationShape(source.location);
    if (nested) {
      return nested;
    }
  }

  const coordinates = source.coordinates || source.geom?.coordinates || source.geometry?.coordinates;
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    return {
      latitude: coordinates[1],
      longitude: coordinates[0]
    };
  }

  if (typeof source.geom === "string") {
    const geomLocation = normalizeLocationShape(source.geom);
    if (geomLocation) {
      return geomLocation;
    }
  }

  if (typeof source.geometry === "string") {
    const geometryLocation = normalizeLocationShape(source.geometry);
    if (geometryLocation) {
      return geometryLocation;
    }
  }

  return null;
}

function setMapLinkState() {
  return;
}

function toggleSidebar() {
  if (!refs.sidebar || !refs.sidebarToggleBtn || !refs.sidebarToggleIcon) {
    return;
  }

  if (window.matchMedia("(max-width: 768px)").matches) {
    return;
  }

  const collapsed = refs.sidebar.classList.toggle("collapsed");
  refs.sidebarToggleIcon.textContent = collapsed ? ">>" : "<<";
  refs.sidebarToggleBtn.setAttribute("aria-label", collapsed ? "Expandir menu" : "Recolher menu");
}

function setActiveView(view) {
  const isData = view === "data";
  const isMap = view === "map";
  const isRegister = view === "register";
  const isDatahub = view === "datahub";
  const isReports = view === "reports";
  const isUsers = view === "users";
  const isAdminLogs = view === "admin-logs";

  refs.viewDataBtn.classList.toggle("active", isData);
  refs.viewMapBtn.classList.toggle("active", isMap);
  refs.viewRegisterBtn.classList.toggle("active", isRegister);
  if (refs.viewDatahubBtn) {
    refs.viewDatahubBtn.classList.toggle("active", isDatahub);
    refs.viewDatahubBtn.setAttribute("aria-pressed", isDatahub ? "true" : "false");
  }
  if (refs.viewReportsBtn) {
    refs.viewReportsBtn.classList.toggle("active", isReports);
    refs.viewReportsBtn.setAttribute("aria-pressed", isReports ? "true" : "false");
  }
  if (refs.viewUsersBtn) {
    refs.viewUsersBtn.classList.toggle("active", isUsers);
    refs.viewUsersBtn.setAttribute("aria-pressed", isUsers ? "true" : "false");
  }
  if (refs.viewAdminLogsBtn) {
    refs.viewAdminLogsBtn.classList.toggle("active", isAdminLogs);
    refs.viewAdminLogsBtn.setAttribute("aria-pressed", isAdminLogs ? "true" : "false");
  }
  refs.viewDataBtn.setAttribute("aria-pressed", isData ? "true" : "false");
  refs.viewMapBtn.setAttribute("aria-pressed", isMap ? "true" : "false");
  refs.viewRegisterBtn.setAttribute("aria-pressed", isRegister ? "true" : "false");

  refs.dataPanel.classList.toggle("hidden", !isData);
  refs.mapPanel.classList.toggle("hidden", !isMap);
  refs.registerPanel.classList.toggle("hidden", !isRegister);
  if (refs.datahubPanel) {
    refs.datahubPanel.classList.toggle("hidden", !isDatahub);
  }
  if (refs.reportsPanel) {
    refs.reportsPanel.classList.toggle("hidden", !isReports);
  }
  if (refs.usersPanel) {
    refs.usersPanel.classList.toggle("hidden", !isUsers);
  }
  if (refs.adminLogsPanel) {
    refs.adminLogsPanel.classList.toggle("hidden", !isAdminLogs);
  }
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
  } else if (isRegister) {
    refs.breadcrumbText.textContent = "Início > Gestão de Cadastros";
    refs.pageTitle.textContent = "Gestão de Cadastros";
    refs.viewContextText.textContent = "Mantenha a operação atualizada com criação de estações, usuários e localização.";
  } else if (isDatahub) {
    refs.breadcrumbText.textContent = "Início > Dados";
    refs.pageTitle.textContent = "Central de Dados";
    refs.viewContextText.textContent = "Faça ingestão de arquivos e exporte dados do cliente em JSON, CSV ou XML.";
  } else if (isReports) {
    refs.breadcrumbText.textContent = "Início > Relatórios";
    refs.pageTitle.textContent = "Relatório da Série Histórica";
    refs.viewContextText.textContent = "Gere um relatório executivo com base na última consulta feita no dashboard.";
  } else if (isUsers) {
    refs.breadcrumbText.textContent = "Início > Usuários";
    refs.pageTitle.textContent = "Usuários do Cliente";
    refs.viewContextText.textContent = "Visualize todos os usuários vinculados ao seu client_id.";
  } else {
    refs.breadcrumbText.textContent = "Início > Logs Admin";
    refs.pageTitle.textContent = "Exportação de Logs";
    refs.viewContextText.textContent = "Baixe os logs da API com privilégios administrativos.";
  }

  if (!isMap) {
    resetMapUiState();
    refs.error.textContent = "";
  }

  if (isReports) {
    renderReportPanel();
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

function setDownloadLogsButtonLoading(loading) {
  if (!refs.downloadLogsBtn) {
    return;
  }
  refs.downloadLogsBtn.disabled = loading;
  refs.downloadLogsBtn.textContent = loading ? "Baixando..." : DOWNLOAD_LOGS_BUTTON_LABEL;
}

function setReportsDownloadButtonLoading(loading) {
  if (!refs.reportsDownloadBtn) {
    return;
  }

  refs.reportsDownloadBtn.disabled = loading;
  refs.reportsDownloadBtn.textContent = loading ? "Gerando PDF..." : "📄 Baixar PDF";
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    return lowered === "true" || lowered === "1" || lowered === "admin";
  }
  return false;
}

function toRoleId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeId(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function findCurrentUserFromList(users, userId, tokenPayload) {
  if (!Array.isArray(users) || users.length === 0) {
    return null;
  }

  const userIdToken = normalizeId(userId || tokenPayload?.sub || tokenPayload?.user_id || tokenPayload?.id);
  const tokenEmail = String(tokenPayload?.email || "").trim().toLowerCase();

  if (userIdToken) {
    const byId = users.find((item) => normalizeId(item?.id) === userIdToken);
    if (byId) {
      return byId;
    }
  }

  if (tokenEmail) {
    const byEmail = users.find((item) => String(item?.email || "").trim().toLowerCase() === tokenEmail);
    if (byEmail) {
      return byEmail;
    }
  }

  return null;
}

function extractClientId(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const direct = value.client_id ?? value.clientId;
  if (direct !== undefined && direct !== null && String(direct).trim()) {
    return String(direct);
  }

  const nested = value.client?.id ?? value.client?.client_id ?? value.client?.clientId;
  if (nested !== undefined && nested !== null && String(nested).trim()) {
    return String(nested);
  }

  return null;
}

function isAdminUser(user, payload) {
  const userRoleId = toRoleId(user?.role_id ?? user?.roleId ?? user?.role?.id);
  const payloadRoleId = toRoleId(payload?.role_id ?? payload?.roleId ?? payload?.role?.id);
  return userRoleId === 1 || payloadRoleId === 1;
}

function resolveUserRoleLabel(user) {
  const roleId = toRoleId(user?.role_id ?? user?.roleId ?? user?.role?.id);
  if (roleId === 1) {
    return "Admin";
  }

  return "Usuário";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderUsersTable(users) {
  if (!refs.usersTableBody) {
    return;
  }

  if (!Array.isArray(users) || users.length === 0) {
    refs.usersTableBody.innerHTML = `
      <tr>
        <td colspan="4">Nenhum usuário encontrado para este cliente.</td>
      </tr>
    `;
    return;
  }

  refs.usersTableBody.innerHTML = users.map((user) => {
    const clientId = extractClientId(user) || "-";
    return `
      <tr>
        <td>${escapeHtml(user?.name || "-")}</td>
        <td>${escapeHtml(user?.email || "-")}</td>
        <td>${escapeHtml(resolveUserRoleLabel(user))}</td>
        <td>${escapeHtml(clientId)}</td>
      </tr>
    `;
  }).join("");
}

function buildUsersSignature(users) {
  if (!Array.isArray(users) || users.length === 0) {
    return "empty";
  }

  return users.map((user) => [
    String(user?.id ?? ""),
    String(user?.name ?? ""),
    String(user?.email ?? ""),
    String(user?.role_id ?? user?.roleId ?? user?.role?.id ?? ""),
    String(user?.client_id ?? user?.clientId ?? user?.client?.id ?? "")
  ].join("|")).join(";");
}

function buildMapSignature() {
  if (!Array.isArray(state.devices) || state.devices.length === 0) {
    return "empty";
  }

  return state.devices.map((device) => {
    const location = state.locationByDeviceId[String(device.id)] || null;
    return [
      String(device.id),
      String(device.name || ""),
      String(location?.latitude ?? ""),
      String(location?.longitude ?? "")
    ].join("|");
  }).join(";");
}

async function loadUsersByClient() {
  if (!refs.usersStatusMsg) {
    return;
  }

  const clientId = state.currentUserClientId;
  refs.usersStatusMsg.textContent = "Carregando usuários...";
  refs.usersStatusMsg.classList.remove("error", "success");

  const usersPayload = await apiGet("/api/users/");

  const users = Array.isArray(usersPayload)
    ? usersPayload
    : (Array.isArray(usersPayload?.users) ? usersPayload.users : []);

  let filtered = users;

  if (clientId) {
    filtered = users.filter((user) => {
      const userClientId = extractClientId(user);
      return userClientId ? String(userClientId) === String(clientId) : false;
    });

    const allMissingClientId = users.every((user) => !extractClientId(user));
    if (filtered.length === 0 && users.length > 0 && allMissingClientId) {
      filtered = users;
    }
  }

  renderUsersTable(filtered);
  refs.usersStatusMsg.textContent = clientId
    ? `${filtered.length} usuário(s) encontrado(s) para o cliente ${clientId}.`
    : `${filtered.length} usuário(s) encontrado(s).`;
  refs.usersStatusMsg.classList.add("success");

  return filtered;
}

function flattenLogGroups(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const directItems = Array.isArray(payload?.items)
    ? payload.items
    : (Array.isArray(payload?.logs) ? payload.logs : null);

  if (directItems) {
    return directItems;
  }

  return Object.entries(payload).flatMap(([eventType, entries]) => {
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries.map((entry) => ({ event_type: eventType, ...entry }));
  });
}

function normalizeLogTimestamp(entry) {
  const raw = entry?.timestamp || entry?.created_at || entry?.date || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function filterLogs(entries) {
  const start = refs.adminLogsStartDate?.value || "";
  const end = refs.adminLogsEndDate?.value || "";
  const userFilter = String(refs.adminLogsUserFilter?.value || "").trim().toLowerCase();

  const startTs = start ? Date.parse(`${start}T00:00:00`) : NaN;
  const endTs = end ? Date.parse(`${end}T23:59:59`) : NaN;

  return entries.filter((entry) => {
    const ts = normalizeLogTimestamp(entry);
    if (Number.isFinite(startTs) && (!Number.isFinite(ts) || ts < startTs)) {
      return false;
    }
    if (Number.isFinite(endTs) && (!Number.isFinite(ts) || ts > endTs)) {
      return false;
    }

    if (userFilter) {
      const userText = String(entry?.usuario || entry?.user || entry?.email || "").toLowerCase();
      if (!userText.includes(userFilter)) {
        return false;
      }
    }

    return true;
  });
}

async function downloadAdminLogs() {
  if (!state.currentUserIsAdmin) {
    if (refs.adminLogsMsg) {
      setFormMessage(refs.adminLogsMsg, "Apenas administradores podem exportar logs.", "error");
    }
    return;
  }

  if (refs.adminLogsMsg) {
    setFormMessage(refs.adminLogsMsg, "", null);
  }
  setDownloadLogsButtonLoading(true);

  try {
    const logsPayload = await apiGet("/api/logs/?limit=500");
    const logs = flattenLogGroups(logsPayload);
    const filteredLogs = filterLogs(logs);

    if (filteredLogs.length === 0) {
      throw new Error("Nenhum log encontrado com os filtros informados.");
    }

    const xml = toXml(filteredLogs, "logs", "log");
    const dateToken = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    triggerDownload(xml, `logs-filtrados-${dateToken}.xml`, "application/xml");

    if (refs.adminLogsMsg) {
      setFormMessage(refs.adminLogsMsg, `${filteredLogs.length} log(s) exportado(s) com sucesso.`, "success");
    }
  } catch (error) {
    if (refs.adminLogsMsg) {
      setFormMessage(refs.adminLogsMsg, error.message, "error");
    }
  } finally {
    setDownloadLogsButtonLoading(false);
  }
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
  showMapInsight();
  setMapInsight("Detalhes da estação", NaN, NaN, "Último dado: clique em um pin");

  if (state.map) {
    state.map.closePopup();
  }
}

function hideMapInsight() {
  refs.mapInsightPanel.classList.remove("hidden");
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

  const revealMarker = () => {
    state.map.setView(marker.getLatLng(), Math.max(state.map.getZoom(), 13), {
      animate: true
    });
    marker.openPopup();
  };

  if (state.mapMarkersLayer && typeof state.mapMarkersLayer.zoomToShowLayer === "function") {
    state.mapMarkersLayer.zoomToShowLayer(marker, revealMarker);
    return;
  }

  revealMarker();
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

  const device = state.devices.find((item) => String(item?.id) === String(deviceId));
  const embeddedLocation = normalizeLocationShape(device);
  if (embeddedLocation) {
    state.locationByDeviceId[String(deviceId)] = embeddedLocation;
    return embeddedLocation;
  }

  const location = await apiGetOrNull(`/api/devices/${deviceId}/location/`);
  const normalized = normalizeLocationShape(location);
  state.locationByDeviceId[String(deviceId)] = normalized;
  return normalized;
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
  state.lastMapSignature = buildMapSignature();
  setTimeout(() => {
    if (state.map) {
      state.map.invalidateSize();
    }
  }, 0);
}

function closeMapPanel() {
  setActiveView("data");
}

async function openUsersPanel() {
  setActiveView("users");
  refs.error.textContent = "";
  const users = await loadUsersByClient();
  state.lastUsersSignature = buildUsersSignature(users);
}

async function openReportsPanel() {
  setActiveView("reports");
  refs.error.textContent = "";
  await loadAllStationsReport({ force: true });
}

function openAdminLogsPanel() {
  setActiveView("admin-logs");
  refs.error.textContent = "";
  if (refs.adminLogsMsg) {
    setFormMessage(refs.adminLogsMsg, "", null);
  }
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

function computeVariableReportStats(observations, variableKey) {
  if (!Array.isArray(observations) || observations.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      avg: null,
      last: null
    };
  }

  const values = observations.map((item) => Number(item?.[variableKey])).filter((item) => Number.isFinite(item));
  if (values.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      avg: null,
      last: null
    };
  }

  const avg = values.reduce((acc, item) => acc + item, 0) / values.length;
  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    avg,
    last: values[values.length - 1]
  };
}

function buildStationReportEntry(device, observations, location) {
  const lastObservation = pickLatestObservation(observations);
  const variableStats = {};

  for (const variableKey of REPORT_VARIABLE_KEYS) {
    variableStats[variableKey] = computeVariableReportStats(observations, variableKey);
  }

  return {
    device,
    location,
    observations: Array.isArray(observations) ? observations : [],
    lastObservation,
    variableStats
  };
}

function buildReportSignature() {
  if (!Array.isArray(state.currentReportData) || state.currentReportData.length === 0) {
    return "empty";
  }

  return state.currentReportData.map((entry) => {
    const lastRegister = entry.lastObservation?.register || "";
    return `${entry.device.id}|${entry.observations.length}|${lastRegister}`;
  }).join("|");
}

function renderStationReportCard(entry) {
  const stationName = entry.device?.name || `Estação ${entry.device?.id}`;
  const locationText = formatLocation(entry.location);
  const latestText = entry.lastObservation ? latestReadingText(entry.lastObservation) : "Sem dados disponíveis";
  const variableCards = REPORT_VARIABLE_KEYS.map((variableKey) => {
    const stats = entry.variableStats[variableKey];
    const label = VARIABLE_LABELS[variableKey] || variableKey;

    if (!stats || stats.count === 0) {
      return `
        <div class="report-variable-item">
          <span class="report-variable-name">${label}</span>
          <span class="report-variable-value">Sem dados</span>
        </div>
      `;
    }

    return `
      <div class="report-variable-item">
        <span class="report-variable-name">${label}</span>
        <span class="report-variable-value">Média ${formatMetricValue(stats.avg, variableKey)} | Min ${formatMetricValue(stats.min, variableKey)} | Max ${formatMetricValue(stats.max, variableKey)}</span>
      </div>
    `;
  }).join("");

  return `
    <article class="report-station-card">
      <div class="report-station-head">
        <div>
          <p class="report-station-title">${escapeHtml(stationName)}</p>
          <p class="report-station-meta">ID ${escapeHtml(entry.device?.id ?? "-")} • ${escapeHtml(locationText)}</p>
        </div>
        <div class="report-station-badge">${entry.observations.length} registros</div>
      </div>

      <div class="report-station-grid">
        <div class="report-station-item">
          <span class="report-station-item-label">Localização</span>
          <span class="report-station-item-value">${escapeHtml(locationText)}</span>
        </div>
        <div class="report-station-item">
          <span class="report-station-item-label">Última leitura</span>
          <span class="report-station-item-value">${escapeHtml(latestText)}</span>
        </div>
      </div>

      <div class="report-variable-grid">
        ${variableCards}
      </div>
    </article>
  `;
}

function getCurrentUserDisplayName() {
  return state.currentUser?.name
    || state.currentUser?.email
    || refs.userMenuBtn?.textContent
    || "Usuário";
}

function getReportFiltersFromInputs() {
  const stationId = refs.reportsStationSelect?.value || "all";
  const start = refs.reportsStartDate?.value || "";
  const end = refs.reportsEndDate?.value || "";

  if (!start || !end) {
    throw new Error("Preencha data início e data fim para o relatório.");
  }

  if (start > end) {
    throw new Error("Data início não pode ser maior que data fim.");
  }

  return { stationId, start, end };
}

function populateReportsStationFilter(devices) {
  if (!refs.reportsStationSelect) {
    return;
  }

  const previousValue = refs.reportsStationSelect.value || "all";
  refs.reportsStationSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Todas as estações";
  refs.reportsStationSelect.appendChild(allOption);

  if (Array.isArray(devices)) {
    devices.forEach((device) => {
      const option = document.createElement("option");
      option.value = String(device.id);
      option.textContent = device.name || `Device ${device.id}`;
      refs.reportsStationSelect.appendChild(option);
    });
  }

  const availableValues = new Set(Array.from(refs.reportsStationSelect.options).map((option) => option.value));
  refs.reportsStationSelect.value = availableValues.has(previousValue) ? previousValue : "all";
}

async function applyReportsFilters() {
  try {
    await loadAllStationsReport({ force: true });
  } catch (error) {
    if (refs.reportsStatusMsg) {
      setFormMessage(refs.reportsStatusMsg, error.message, "error");
    }
  }
}

function inferContentTypeFromFile(file) {
  const fileName = String(file?.name || "").toLowerCase();
  if (fileName.endsWith(".json")) {
    return "application/json";
  }
  if (fileName.endsWith(".csv")) {
    return "text/csv";
  }
  if (fileName.endsWith(".xml")) {
    return "application/xml";
  }
  return "";
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function flattenValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function toCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "";
  }

  const headers = Array.from(rows.reduce((acc, row) => {
    if (row && typeof row === "object") {
      Object.keys(row).forEach((key) => acc.add(key));
    }
    return acc;
  }, new Set()));

  const headerLine = headers.map((header) => escapeCsv(header)).join(",");
  const bodyLines = rows.map((row) => headers
    .map((header) => escapeCsv(flattenValue(row?.[header])))
    .join(","));

  return [headerLine, ...bodyLines].join("\n");
}

function escapeXmlValue(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toXml(rows, rootTag, itemTag) {
  const items = (Array.isArray(rows) ? rows : []).map((row) => {
    const fields = Object.entries(row || {}).map(([key, value]) => {
      const content = typeof value === "object" && value !== null
        ? escapeXmlValue(JSON.stringify(value))
        : escapeXmlValue(value);
      return `    <${key}>${content}</${key}>`;
    }).join("\n");
    return `  <${itemTag}>\n${fields}\n  </${itemTag}>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootTag}>\n${items}\n</${rootTag}>`;
}

function triggerDownload(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvContent(text) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function parseXmlContent(text) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(String(text || ""), "application/xml");
  if (xmlDoc.querySelector("parsererror")) {
    throw new Error("XML inválido. Revise o arquivo enviado.");
  }

  const root = xmlDoc.documentElement;
  if (!root) {
    return [];
  }

  const items = Array.from(root.children || []);
  return items.map((item) => {
    const row = {};
    Array.from(item.children || []).forEach((field) => {
      row[field.tagName] = field.textContent?.trim() || "";
    });
    return row;
  });
}

function normalizeParsedRecords(contentType, text) {
  if (contentType === "application/json") {
    const parsed = JSON.parse(String(text || "[]"));
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed?.devices)) {
      return parsed.devices;
    }
    if (Array.isArray(parsed?.observations)) {
      return parsed.observations;
    }
    throw new Error("JSON inválido para ingestão. Use um array de objetos.");
  }

  if (contentType === "text/csv") {
    return parseCsvContent(text);
  }

  if (contentType === "application/xml") {
    return parseXmlContent(text);
  }

  throw new Error("Formato de arquivo não suportado.");
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function validateIngestRecords(target, rows) {
  const errors = [];
  const requiredForDevices = [
    "external_id",
    "name",
    "type_id",
    "provider_id",
    "is_active",
    "timezone",
    "availability_interval"
  ];

  rows.forEach((row, index) => {
    if (target === "devices") {
      requiredForDevices.forEach((field) => {
        if (!hasValue(row?.[field])) {
          errors.push(`Linha ${index + 1}: campo obrigatório ausente (${field}).`);
        }
      });
      return;
    }

    const hasId = hasValue(row?.id);
    const hasExternalId = hasValue(row?.external_id);
    if (!hasId && !hasExternalId) {
      errors.push(`Linha ${index + 1}: informe id ou external_id.`);
    }
    if (!hasValue(row?.register)) {
      errors.push(`Linha ${index + 1}: campo obrigatório ausente (register).`);
    }
  });

  return {
    total: rows.length,
    errors,
    invalidCount: errors.length,
    validCount: Math.max(rows.length - errors.length, 0)
  };
}

function renderIngestPreview(records, validation) {
  if (!refs.datahubPreviewBox || !refs.datahubPreviewHead || !refs.datahubPreviewBody || !refs.datahubPreviewSummary) {
    return;
  }

  if (!Array.isArray(records) || records.length === 0) {
    refs.datahubPreviewBox.classList.add("hidden");
    refs.datahubPreviewHead.innerHTML = "";
    refs.datahubPreviewBody.innerHTML = "";
    refs.datahubPreviewSummary.textContent = "";
    return;
  }

  const headers = Array.from(records.reduce((acc, row) => {
    if (row && typeof row === "object") {
      Object.keys(row).forEach((key) => acc.add(key));
    }
    return acc;
  }, new Set()));

  refs.datahubPreviewBox.classList.remove("hidden");
  refs.datahubPreviewHead.innerHTML = `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;

  const previewRows = records.slice(0, 5).map((row) => `
    <tr>
      ${headers.map((header) => `<td>${escapeHtml(flattenValue(row?.[header]))}</td>`).join("")}
    </tr>
  `).join("");

  refs.datahubPreviewBody.innerHTML = previewRows;
  refs.datahubPreviewSummary.textContent = validation.invalidCount > 0
    ? `Pré-validação: ${validation.total} item(ns), ${validation.invalidCount} erro(s). Corrija antes de enviar.`
    : `Pré-validação: ${validation.total} item(ns), sem erros obrigatórios.`;
}

async function buildIngestPreview() {
  const target = refs.datahubIngestTarget?.value;
  const file = refs.datahubIngestFile?.files?.[0];
  if (!target || !file) {
    ingestPreviewState = null;
    renderIngestPreview([], { total: 0, invalidCount: 0 });
    return null;
  }

  const contentType = inferContentTypeFromFile(file);
  if (!contentType) {
    throw new Error("Formato inválido. Use .json, .csv ou .xml.");
  }

  if (target === "observations" && contentType === "application/xml") {
    throw new Error("Observations ainda não aceita XML. Use JSON ou CSV.");
  }

  const text = await file.text();
  const records = normalizeParsedRecords(contentType, text);
  const validation = validateIngestRecords(target, records);
  ingestPreviewState = { target, contentType, text, records, validation };
  renderIngestPreview(records, validation);
  return ingestPreviewState;
}

async function uploadDatahubFile() {
  const target = refs.datahubIngestTarget?.value;
  const file = refs.datahubIngestFile?.files?.[0];

  if (!target || !file) {
    setFormMessage(refs.datahubIngestMsg, "Selecione o destino e um arquivo para envio.", "error");
    return;
  }

  const endpoint = target === "devices" ? "/api/devices/ingest" : "/api/observations/ingest";
  const originalLabel = refs.datahubIngestBtn.textContent;

  try {
    refs.datahubIngestBtn.disabled = true;
    refs.datahubIngestBtn.textContent = "Enviando...";

    const preview = await buildIngestPreview();
    if (!preview) {
      throw new Error("Não foi possível validar o arquivo.");
    }

    if (preview.target !== target) {
      throw new Error("Destino alterado. Revalide o arquivo antes de enviar.");
    }

    if (preview.validation.invalidCount > 0) {
      const firstErrors = preview.validation.errors.slice(0, 3).join(" ");
      throw new Error(`Arquivo com erro de validação. ${firstErrors}`);
    }

    const result = await apiPostRaw(endpoint, preview.text, preview.contentType);
    const message = result?.msg || result?.message || "Arquivo processado com sucesso.";
    setFormMessage(refs.datahubIngestMsg, message, "success");
    refs.datahubIngestFile.value = "";
    ingestPreviewState = null;
    renderIngestPreview([], { total: 0, invalidCount: 0 });
  } catch (error) {
    setFormMessage(refs.datahubIngestMsg, error.message, "error");
  } finally {
    refs.datahubIngestBtn.disabled = false;
    refs.datahubIngestBtn.textContent = originalLabel;
  }
}

async function downloadDatahubTable() {
  const table = refs.datahubExportTable?.value;
  const format = refs.datahubExportFormat?.value;

  const tableMap = {
    devices: { path: "/api/devices/", root: "devices", item: "device" },
    observations: { path: "/api/observations/", root: "observations", item: "observation" },
    users: { path: "/api/users/", root: "users", item: "user" }
  };

  const config = tableMap[table];
  if (!config) {
    setFormMessage(refs.datahubExportMsg, "Tabela inválida para exportação.", "error");
    return;
  }

  const originalLabel = refs.datahubExportBtn.textContent;
  try {
    refs.datahubExportBtn.disabled = true;
    refs.datahubExportBtn.textContent = "Baixando...";

    const payload = await apiGet(config.path);
    const rows = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload?.data) ? payload.data : []));

    if (!Array.isArray(rows) || rows.length === 0) {
      setFormMessage(refs.datahubExportMsg, "Nenhum dado encontrado para exportar.", "error");
      return;
    }

    const dateToken = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    if (format === "json") {
      triggerDownload(JSON.stringify(rows, null, 2), `${table}-${dateToken}.json`, "application/json");
    } else if (format === "csv") {
      triggerDownload(toCsv(rows), `${table}-${dateToken}.csv`, "text/csv");
    } else {
      triggerDownload(toXml(rows, config.root, config.item), `${table}-${dateToken}.xml`, "application/xml");
    }

    setFormMessage(refs.datahubExportMsg, `Download de ${table} em ${format.toUpperCase()} iniciado.`, "success");
  } catch (error) {
    setFormMessage(refs.datahubExportMsg, error.message, "error");
  } finally {
    refs.datahubExportBtn.disabled = false;
    refs.datahubExportBtn.textContent = originalLabel;
  }
}

function renderReportPanel() {
  if (!refs.reportsPanel) {
    return;
  }

  const reportData = Array.isArray(state.currentReportData) ? state.currentReportData : [];
  const hasData = reportData.length > 0;

  if (refs.reportsEmptyState) {
    refs.reportsEmptyState.classList.toggle("hidden", hasData);
  }

  if (state.currentReportLoading) {
    if (refs.reportsStatusMsg) {
      setFormMessage(refs.reportsStatusMsg, "Carregando dados de todas as estações acessíveis...", null);
    }
    if (refs.reportsSummaryGrid) {
      refs.reportsSummaryGrid.innerHTML = "";
    }
    if (refs.reportsContext) {
      refs.reportsContext.innerHTML = "";
    }
    if (refs.reportsTableBody) {
      refs.reportsTableBody.innerHTML = `
        <tr>
          <td colspan="8">Carregando relatório...</td>
        </tr>
      `;
    }
    return;
  }

  if (!hasData) {
    if (refs.reportsStatusMsg) {
      setFormMessage(refs.reportsStatusMsg, "Clique em Atualizar relatório para carregar todas as estações acessíveis.", "error");
    }
    if (refs.reportsSummaryGrid) {
      refs.reportsSummaryGrid.innerHTML = "";
    }
    if (refs.reportsContext) {
      refs.reportsContext.innerHTML = "";
    }
    if (refs.reportsTableBody) {
      refs.reportsTableBody.innerHTML = `
        <tr>
          <td colspan="8">Nenhum relatório gerado ainda.</td>
        </tr>
      `;
    }
    return;
  }

  const signature = buildReportSignature();
  state.currentReportSignature = signature;

    const totalStations = reportData.length;
    const stationsWithData = reportData.filter((entry) => entry.observations.length > 0).length;
    const stationsWithLocation = reportData.filter((entry) => {
      const lat = Number(entry.location?.latitude);
      const lon = Number(entry.location?.longitude);
      return Number.isFinite(lat) && Number.isFinite(lon);
    }).length;
    const totalObservations = reportData.reduce((acc, entry) => acc + entry.observations.length, 0);
    const latestOverall = reportData
      .map((entry) => entry.lastObservation)
      .filter(Boolean)
      .sort((a, b) => Date.parse(b.register || "") - Date.parse(a.register || ""))[0] || null;
    const latestOverallText = latestOverall ? latestReadingText(latestOverall) : "Sem registros recentes";

  if (refs.reportsStatusMsg) {
    setFormMessage(refs.reportsStatusMsg, `Relatório carregado com ${totalStations} estação(ões) acessível(is) e ${totalObservations} leitura(s).`, "success");
  }

  if (refs.reportsSummaryGrid) {
    refs.reportsSummaryGrid.innerHTML = [
        summaryItem("Estações", String(totalStations), `Com dados: ${stationsWithData}`),
        summaryItem("Localizadas", String(stationsWithLocation), `Sem localização: ${totalStations - stationsWithLocation}`),
        summaryItem("Registros", String(totalObservations), `Total de observações acessíveis`),
        summaryItem("Variáveis", String(REPORT_VARIABLE_KEYS.length), `Temperatura, umidade, pressão, vento e chuva`),
        summaryItem("Última leitura", latestOverall ? formatDisplayDateTime(latestOverall.register) : "-", latestOverallText)
    ].join("");
  }

  if (refs.reportsContext) {
      refs.reportsContext.innerHTML = reportData.map((entry) => renderStationReportCard(entry)).join("");
  }

  if (refs.reportsTableBody) {
    const rows = reportData.flatMap((entry) => {
        const stationName = entry.device?.name || `Estação ${entry.device?.id}`;
      const orderedObservations = [...entry.observations].sort((a, b) => Date.parse(b?.register || "") - Date.parse(a?.register || ""));

      return orderedObservations.map((item) => `
        <tr>
          <td>${escapeHtml(stationName)}</td>
          <td>${formatDisplayDateTime(item?.register)}</td>
          <td>${formatMetricValue(item?.air_temperature, "air_temperature")}</td>
          <td>${formatMetricValue(item?.air_humidity, "air_humidity")}</td>
          <td>${formatMetricValue(item?.air_pressure, "air_pressure")}</td>
          <td>${formatMetricValue(item?.wind_speed, "wind_speed")}</td>
          <td>${formatMetricValue(item?.wind_direction, "wind_direction")}</td>
          <td>${formatMetricValue(item?.rain_accumulated, "rain_accumulated")}</td>
        </tr>
      `);
    }).join("");

    refs.reportsTableBody.innerHTML = rows || `
      <tr>
        <td colspan="8">Nenhum registro encontrado.</td>
      </tr>
    `;
  }
}

  async function loadAllStationsReport(options = {}) {
    const { force = false } = options;

    if (state.currentReportLoading && !force) {
      return;
    }

    if (!Array.isArray(state.devices) || state.devices.length === 0) {
      await loadStations();
    }

    const filters = getReportFiltersFromInputs();
    state.currentReportFilters = filters;

    const scopedDevices = filters.stationId === "all"
      ? state.devices
      : state.devices.filter((device) => String(device.id) === String(filters.stationId));

    if (!Array.isArray(scopedDevices) || scopedDevices.length === 0) {
      state.currentReportData = [];
      renderReportPanel();
      return;
    }

    state.currentReportLoading = true;
    renderReportPanel();

    try {
      const reportData = await Promise.all(scopedDevices.map(async (device) => {
        const query = `start=${encodeURIComponent(filters.start)}&end=${encodeURIComponent(filters.end)}`;
        const [observations, location] = await Promise.all([
          apiGet(`/api/observations/${device.id}?${query}`),
          getLocationForDevice(device.id)
        ]);

        return buildStationReportEntry(device, Array.isArray(observations) ? observations : [], location);
      }));

      state.currentReportData = reportData;
      state.currentReportSignature = buildReportSignature();
    } catch (error) {
      state.currentReportData = [];
      if (refs.reportsStatusMsg) {
        setFormMessage(refs.reportsStatusMsg, error.message, "error");
      }
    } finally {
      state.currentReportLoading = false;
      renderReportPanel();
    }
  }

function metricUnit(variableKey) {
  return VARIABLE_UNITS[variableKey] || "";
}

async function autoRefreshMapIfNeeded() {
  if (refs.mapPanel.classList.contains("hidden")) {
    return;
  }

  const previousSignature = state.lastMapSignature || buildMapSignature();
  const selectedStationId = refs.stationSelect.value;

  await loadStations();
  await renderStationsMap(selectedStationId);

  const currentSignature = buildMapSignature();
  state.lastMapSignature = currentSignature;
  if (previousSignature && currentSignature !== previousSignature) {
    refs.error.textContent = `Mapa atualizado automaticamente as ${nowTimeLabel()}.`;
  }
}

async function autoRefreshUsersIfNeeded() {
  if (!refs.usersPanel || refs.usersPanel.classList.contains("hidden")) {
    return;
  }

  if (state.usersAutoRefreshInFlight) {
    return;
  }

  state.usersAutoRefreshInFlight = true;
  try {
    const previousSignature = state.lastUsersSignature || "";
    const users = await loadUsersByClient();
    const currentSignature = buildUsersSignature(users);
    state.lastUsersSignature = currentSignature;

    if (previousSignature && currentSignature !== previousSignature && refs.usersStatusMsg) {
      setFormMessage(refs.usersStatusMsg, `Usuários atualizados automaticamente as ${nowTimeLabel()}.`, "success");
    }
  } finally {
    state.usersAutoRefreshInFlight = false;
  }
}

async function autoRefreshReportsIfNeeded() {
  if (!refs.reportsPanel || refs.reportsPanel.classList.contains("hidden")) {
    return;
  }

  if (state.currentReportLoading || state.reportsAutoRefreshInFlight) {
    return;
  }

  state.reportsAutoRefreshInFlight = true;
  try {
    const previousSignature = state.currentReportSignature || "";
    await loadAllStationsReport({ force: true });
    const currentSignature = state.currentReportSignature || "";

    if (previousSignature && currentSignature !== previousSignature && refs.reportsStatusMsg) {
      setFormMessage(refs.reportsStatusMsg, `Relatório atualizado automaticamente as ${nowTimeLabel()}.`, "success");
    }
  } finally {
    state.reportsAutoRefreshInFlight = false;
  }
}

async function autoRefreshViewsIfNeeded() {
  await autoRefreshSeriesIfNeeded();

  try {
    await autoRefreshMapIfNeeded();
  } catch (_error) {
    // Keep silent for non-active workflows.
  }

  try {
    await autoRefreshUsersIfNeeded();
  } catch (_error) {
    // Keep silent for non-active workflows.
  }

  try {
    await autoRefreshReportsIfNeeded();
  } catch (_error) {
    // Keep silent for non-active workflows.
  }
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

  if (refs.reportsStartDate) {
    refs.reportsStartDate.value = formatDate(start);
  }
  if (refs.reportsEndDate) {
    refs.reportsEndDate.value = formatDate(end);
  }
}

function syncAdminTabVisibility() {
  if (!refs.viewAdminLogsBtn) {
    return;
  }

  refs.viewAdminLogsBtn.classList.toggle("hidden", !state.currentUserIsAdmin);
}

async function loadCurrentUserContext() {
  const tokenPayload = parseJwtPayload(localStorage.getItem("pw_access_token"));
  const userId = getCurrentUserIdFromToken();

  let user = null;
  try {
    const usersPayload = await apiGet("/api/users/");
    const users = Array.isArray(usersPayload)
      ? usersPayload
      : (Array.isArray(usersPayload?.users) ? usersPayload.users : []);
    user = findCurrentUserFromList(users, userId, tokenPayload);
  } catch (_error) {
    user = null;
  }

  const userRoleId = toRoleId(user?.role_id ?? user?.roleId ?? user?.role?.id);
  const resolvedUserId = normalizeId(user?.id || userId || tokenPayload?.sub || tokenPayload?.user_id || tokenPayload?.id);

  if (resolvedUserId && userRoleId === null) {
    try {
      const detailedUser = await apiGet(`/api/users/${resolvedUserId}`);
      if (detailedUser && typeof detailedUser === "object") {
        user = { ...(user || {}), ...detailedUser };
      }
    } catch (_error) {
      // If details endpoint fails, keep list-based user context.
    }
  }

  state.currentUser = user || tokenPayload || null;
  state.currentUserClientId = extractClientId(user) || extractClientId(tokenPayload) || null;
  state.currentUserIsAdmin = isAdminUser(user, tokenPayload);

  console.log("[dashboard] usuário autenticado:", {
    id: user?.id ?? tokenPayload?.sub ?? tokenPayload?.user_id ?? tokenPayload?.id ?? null,
    name: user?.name ?? tokenPayload?.name ?? null,
    email: user?.email ?? tokenPayload?.email ?? null,
    client_id: state.currentUserClientId,
    role_id: toRoleId(user?.role_id ?? user?.roleId ?? user?.role?.id ?? tokenPayload?.role_id ?? tokenPayload?.roleId ?? tokenPayload?.role?.id),
    isAdmin: state.currentUserIsAdmin,
    source: user ? "api/users" : "token"
  });

  const returnedRoleId = toRoleId(user?.role_id ?? user?.roleId ?? user?.role?.id);
  if (user && returnedRoleId === null) {
    console.warn("GET /api/users/ e GET /api/users/<id> não retornaram role_id; admin só é identificado quando role_id == 1.");
  }

  refs.userMenuBtn.textContent = user?.name || user?.email || tokenPayload?.name || tokenPayload?.email || "Usuário";
  syncAdminTabVisibility();
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

  populateReportsStationFilter(devices);
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

function getSeriesQueryFromFilters() {
  const stationId = refs.stationSelect.value;
  const variable = refs.variableSelect.value;
  const start = refs.startDate.value;
  const end = refs.endDate.value;

  return { stationId, variable, start, end };
}

function buildSeriesSignature(observations, variableKey) {
  if (!Array.isArray(observations) || observations.length === 0) {
    return "empty";
  }

  const last = observations[observations.length - 1] || {};
  const lastValue = Number(last[variableKey]);
  const valueToken = Number.isFinite(lastValue) ? lastValue.toFixed(4) : "na";
  return `${observations.length}|${String(last.register || "")}|${valueToken}`;
}

function nowTimeLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

function applySeriesData(queryParams, observations, options = {}) {
  const { autoUpdated = false } = options;
  const { stationId, variable, start, end } = queryParams;
  const variableLabel = VARIABLE_LABELS[variable] || variable;

  if (!Array.isArray(observations) || observations.length === 0) {
    buildChart([], [], variableLabel);
    refs.summaryGrid.innerHTML = "";
    renderLatestTable("-", variableLabel, [], variable);
    state.currentObservations = [];
    refs.chartTitle.textContent = `Estação ${stationId} - ${variableLabel}`;
    refs.chartSubtitle.textContent = `${start} até ${end}`;
    return;
  }

  const labels = observations.map((item) => String(item.register || ""));
  const values = observations.map((item) => Number(item[variable]));
  const stationName = refs.stationSelect.options[refs.stationSelect.selectedIndex]?.text || `Estação ${stationId}`;

  refs.chartTitle.textContent = `${stationName} - ${variableLabel}`;
  refs.chartSubtitle.textContent = autoUpdated
    ? `${start} até ${end} • atualizado ${nowTimeLabel()}`
    : `${start} até ${end}`;

  state.currentObservations = observations;

  buildChart(labels, values, variableLabel);
  buildSummaries(values, observations, variable);
  renderLatestTable(stationName, variableLabel, observations, variable);
  renderReportPanel();
}

async function fetchAndApplySeries(queryParams, options = {}) {
  const {
    onlyIfChanged = false,
    suppressEmptyError = false,
    suppressRequestError = false,
    autoUpdated = false
  } = options;
  const { stationId, variable, start, end } = queryParams;

  const query = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const observations = await apiGet(`/api/observations/${stationId}?${query}`);
  const signature = buildSeriesSignature(observations, variable);

  if (onlyIfChanged && signature === state.lastSeriesSignature) {
    return false;
  }

  state.lastSeriesSignature = signature;
  state.currentSeriesQuery = { stationId, variable, start, end };

  if ((!Array.isArray(observations) || observations.length === 0) && !suppressEmptyError) {
    refs.error.textContent = "Nenhum dado encontrado para os filtros informados.";
  } else if (!suppressRequestError) {
    refs.error.textContent = "";
  }

  applySeriesData(queryParams, observations, { autoUpdated });
  return true;
}

async function searchSeries() {
  refs.error.textContent = "";

  const queryParams = getSeriesQueryFromFilters();
  const { stationId, variable, start, end } = queryParams;

  if (!stationId || !variable || !start || !end) {
    refs.error.textContent = "Preencha estação, variável e período.";
    return;
  }

  try {
    await fetchAndApplySeries(queryParams);
  } catch (error) {
    refs.error.textContent = error.message;
  }
}

async function autoRefreshSeriesIfNeeded() {
  if (refs.dataPanel.classList.contains("hidden")) {
    return;
  }

  if (!state.currentSeriesQuery || state.seriesAutoRefreshInFlight) {
    return;
  }

  state.seriesAutoRefreshInFlight = true;
  try {
    const changed = await fetchAndApplySeries(state.currentSeriesQuery, {
      onlyIfChanged: true,
      suppressEmptyError: true,
      suppressRequestError: true,
      autoUpdated: true
    });

    if (changed) {
      refs.error.textContent = `Dados atualizados automaticamente as ${nowTimeLabel()}.`;
    }
  } catch (error) {
    // Keep silent on auto refresh failure to avoid interrupting the operator workflow.
  } finally {
    state.seriesAutoRefreshInFlight = false;
  }
}

function startSeriesAutoRefresh() {
  if (state.seriesAutoRefreshTimer) {
    window.clearInterval(state.seriesAutoRefreshTimer);
  }

  state.seriesAutoRefreshTimer = window.setInterval(() => {
    autoRefreshViewsIfNeeded();
  }, 5 * 60 * 1000);
}

async function getJsPdfConstructor() {
  const fromWindow = window.jspdf?.jsPDF;
  if (typeof fromWindow === "function") {
    return fromWindow;
  }

  try {
    const jsPdfModule = await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm");
    if (typeof jsPdfModule.jsPDF === "function") {
      return jsPdfModule.jsPDF;
    }
  } catch (error) {
    // Ignore and try next fallback.
  }

  try {
    const jsPdfModule = await import("https://unpkg.com/jspdf@2.5.1/dist/jspdf.es.min.js");
    if (typeof jsPdfModule.jsPDF === "function") {
      return jsPdfModule.jsPDF;
    }
  } catch (error) {
    // Ignore, handled below.
  }

  return null;
}

async function downloadSeriesPdf() {
  if (!state.currentSeriesQuery || !Array.isArray(state.currentObservations) || state.currentObservations.length === 0) {
    const queryParams = getSeriesQueryFromFilters();
    const { stationId, variable, start, end } = queryParams;

    if (!stationId || !variable || !start || !end) {
      refs.error.textContent = "Preencha estação, variável e período para baixar o PDF.";
      return;
    }

    try {
      await fetchAndApplySeries(queryParams, {
        onlyIfChanged: false,
        suppressEmptyError: false,
        suppressRequestError: false,
        autoUpdated: false
      });
    } catch (error) {
      refs.error.textContent = error.message;
      return;
    }

    if (!Array.isArray(state.currentObservations) || state.currentObservations.length === 0) {
      refs.error.textContent = "Nenhum dado disponível para gerar o PDF.";
      return;
    }
  }

  setDownloadPdfButtonLoading(true);

  try {
    const JsPDF = await getJsPdfConstructor();
    if (typeof JsPDF !== "function") {
      refs.error.textContent = "Nao foi possivel carregar a biblioteca de PDF. Verifique sua conexao com a internet e tente novamente.";
      return;
    }

    const { stationId, variable, start, end } = state.currentSeriesQuery;
    const stationName = refs.stationSelect.options[refs.stationSelect.selectedIndex]?.text || `Estação ${stationId}`;
    const variableLabel = VARIABLE_LABELS[variable] || variable;
    const values = state.currentObservations.map((item) => Number(item[variable])).filter((item) => Number.isFinite(item));
    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;
    const avg = values.length ? values.reduce((acc, item) => acc + item, 0) / values.length : null;

    const doc = new JsPDF({ unit: "mm", format: "a4" });
    let y = 14;

    doc.setFontSize(14);
    doc.text("Relatorio de Serie Historica", 10, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Estacao: ${stationName}`, 10, y);
    y += 6;
    doc.text(`Variavel: ${variableLabel}`, 10, y);
    y += 6;
    doc.text(`Periodo: ${start} ate ${end}`, 10, y);
    y += 6;
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 10, y);
    y += 8;

    doc.text(`Registros: ${state.currentObservations.length}`, 10, y);
    y += 6;
    doc.text(`Minimo: ${min === null ? "-" : formatMetricValue(min, variable)}`, 10, y);
    y += 6;
    doc.text(`Maximo: ${max === null ? "-" : formatMetricValue(max, variable)}`, 10, y);
    y += 6;
    doc.text(`Media: ${avg === null ? "-" : formatMetricValue(avg, variable)}`, 10, y);
    y += 8;

    try {
      const chartImage = refs.chartCanvas.toDataURL("image/png", 1.0);
      doc.addImage(chartImage, "PNG", 10, y, 190, 70);
      y += 76;
    } catch (error) {
      doc.text("Grafico indisponivel para exportacao.", 10, y);
      y += 6;
    }

    doc.text("Ultimas leituras:", 10, y);
    y += 6;
    doc.setFontSize(9);

    const latestRows = state.currentObservations.slice(-12).reverse();
    for (const item of latestRows) {
      if (y > 285) {
        doc.addPage();
        y = 14;
      }
      const line = `${formatDisplayDateTime(item.register)} | ${formatMetricValue(item[variable], variable)}`;
      doc.text(line, 10, y);
      y += 5;
    }

    const safeStation = String(stationName).trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase() || "estacao";
    doc.save(`serie-historica-${safeStation}.pdf`);
  } catch (error) {
    refs.error.textContent = "Falha ao gerar o PDF. Tente novamente.";
  } finally {
    setDownloadPdfButtonLoading(false);
  }
}

async function downloadStationsReportPdf() {
  if (state.currentReportLoading) {
    if (refs.reportsStatusMsg) {
      setFormMessage(refs.reportsStatusMsg, "Aguarde o carregamento do relatório.", "error");
    }
    return;
  }

  await loadAllStationsReport({ force: true });

  if (!Array.isArray(state.currentReportData) || state.currentReportData.length === 0) {
    if (refs.reportsStatusMsg) {
      setFormMessage(refs.reportsStatusMsg, "Nao ha estações para gerar o PDF.", "error");
    }
    return;
  }

  setReportsDownloadButtonLoading(true);

  try {
    const JsPDF = await getJsPdfConstructor();
    if (typeof JsPDF !== "function") {
      if (refs.reportsStatusMsg) {
        setFormMessage(refs.reportsStatusMsg, "Nao foi possivel carregar a biblioteca de PDF.", "error");
      }
      return;
    }

    const doc = new JsPDF({ unit: "mm", format: "a4" });
    let y = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const writeLine = (text, indent = 10, step = 5) => {
      if (y > 282) {
        doc.addPage();
        y = 14;
      }
      doc.text(String(text), indent, y);
      y += step;
    };

    const addPageFooter = () => {
      const totalPages = doc.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(10, pageHeight - 14, pageWidth - 10, pageHeight - 14);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Gerado por ${getCurrentUserDisplayName()} • ${new Date().toLocaleString("pt-BR")}`, 10, pageHeight - 8);
        doc.text(`Página ${page} de ${totalPages}`, pageWidth - 10, pageHeight - 8, { align: "right" });
      }
      doc.setTextColor(0, 0, 0);
    };

    const addSectionBox = (title) => {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.roundedRect(8, y - 4, pageWidth - 16, 8, 2, 2, "S");
      doc.setFontSize(11);
      doc.text(String(title), 10, y + 2);
      y += 10;
    };

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(8, 8, pageWidth - 16, 28, 3, 3, "F");
    doc.setFontSize(14);
    doc.text("Relatorio Geral das Estacoes", 12, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 12, 22);
    doc.text(`Gerado por: ${getCurrentUserDisplayName()}`, 12, 28);
    doc.text(`Estacoes acessiveis: ${state.currentReportData.length}`, 112, 22);
    doc.text(`Total de registros: ${state.currentReportData.reduce((acc, entry) => acc + entry.observations.length, 0)}`, 112, 28);
    doc.text(`Periodo: ${state.currentReportFilters.start || "-"} ate ${state.currentReportFilters.end || "-"}`, 12, 34);
    doc.text(`Filtro de estacao: ${state.currentReportFilters.stationId === "all" ? "Todas" : state.currentReportFilters.stationId}`, 112, 34);

    y = 48;

    for (const entry of state.currentReportData) {
      if (y > 240) {
        doc.addPage();
        y = 14;
      }

      addSectionBox(entry.device?.name || `Estacao ${entry.device?.id}`);
      doc.setFontSize(9);
      writeLine(`ID: ${entry.device?.id ?? "-"}`);
      writeLine(`Localizacao: ${formatLocation(entry.location)}`);
      writeLine(`Registros: ${entry.observations.length}`);
      writeLine(`Ultima leitura: ${entry.lastObservation ? latestReadingText(entry.lastObservation) : "Sem dados"}`);

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(10, y - 2, pageWidth - 20, 14, 2, 2, "FD");
      doc.setFontSize(8);
      doc.text("Resumo da localizacao", 12, y + 2);
      doc.text(formatLocation(entry.location), 12, y + 7);
      y += 16;

      for (const variableKey of REPORT_VARIABLE_KEYS) {
        const stats = entry.variableStats[variableKey];
        const variableLabel = VARIABLE_LABELS[variableKey] || variableKey;
        const valueText = stats && stats.count > 0
          ? `Media ${formatMetricValue(stats.avg, variableKey)} | Min ${formatMetricValue(stats.min, variableKey)} | Max ${formatMetricValue(stats.max, variableKey)}`
          : "Sem dados";
        writeLine(`${variableLabel}: ${valueText}`);
      }

      writeLine("Dados completos:");
      const orderedObservations = [...entry.observations].sort((a, b) => Date.parse(b?.register || "") - Date.parse(a?.register || ""));
      for (const item of orderedObservations) {
        const line = [
          formatDisplayDateTime(item?.register),
          `Temp ${formatMetricValue(item?.air_temperature, "air_temperature")}`,
          `Umid ${formatMetricValue(item?.air_humidity, "air_humidity")}`,
          `Press ${formatMetricValue(item?.air_pressure, "air_pressure")}`,
          `Vento ${formatMetricValue(item?.wind_speed, "wind_speed")}`,
          `Dir ${formatMetricValue(item?.wind_direction, "wind_direction")}`,
          `Chuva ${formatMetricValue(item?.rain_accumulated, "rain_accumulated")}`
        ].join(" | ");
        writeLine(line);
      }

      y += 2;
    }

    addPageFooter();
    doc.save(`relatorio-geral-estacoes.pdf`);
    if (refs.reportsStatusMsg) {
      setFormMessage(refs.reportsStatusMsg, "PDF gerado com sucesso.", "success");
    }
  } catch (error) {
    if (refs.reportsStatusMsg) {
      setFormMessage(refs.reportsStatusMsg, error.message || "Falha ao gerar o PDF.", "error");
    }
  } finally {
    setReportsDownloadButtonLoading(false);
  }
}

refs.searchBtn.addEventListener("click", searchSeries);
refs.refreshBtn.addEventListener("click", async () => {
  try {
    await loadStations();
    if (!refs.mapPanel.classList.contains("hidden")) {
      await renderStationsMap(refs.stationSelect.value);
    }
    if (state.currentSeriesQuery) {
      await fetchAndApplySeries(state.currentSeriesQuery, {
        onlyIfChanged: false,
        suppressEmptyError: true,
        suppressRequestError: false,
        autoUpdated: true
      });
    }
  } catch (error) {
    refs.error.textContent = error.message;
  }
});
refs.downloadPdfBtn.addEventListener("click", downloadSeriesPdf);

if (refs.reportsRefreshBtn) {
  refs.reportsRefreshBtn.addEventListener("click", async () => {
    await applyReportsFilters();
  });
}

if (refs.reportsApplyBtn) {
  refs.reportsApplyBtn.addEventListener("click", async () => {
    await applyReportsFilters();
  });
}

if (refs.reportsStationSelect) {
  refs.reportsStationSelect.addEventListener("change", async () => {
    if (refs.reportsPanel && !refs.reportsPanel.classList.contains("hidden")) {
      await applyReportsFilters();
    }
  });
}

if (refs.reportsStartDate) {
  refs.reportsStartDate.addEventListener("change", async () => {
    if (refs.reportsPanel && !refs.reportsPanel.classList.contains("hidden")) {
      await applyReportsFilters();
    }
  });
}

if (refs.reportsEndDate) {
  refs.reportsEndDate.addEventListener("change", async () => {
    if (refs.reportsPanel && !refs.reportsPanel.classList.contains("hidden")) {
      await applyReportsFilters();
    }
  });
}

if (refs.reportsDownloadBtn) {
  refs.reportsDownloadBtn.addEventListener("click", downloadStationsReportPdf);
}

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

if (refs.viewDatahubBtn) {
  refs.viewDatahubBtn.addEventListener("click", () => {
    setActiveView("datahub");
  });
}

if (refs.viewReportsBtn) {
  refs.viewReportsBtn.addEventListener("click", async () => {
    try {
      await openReportsPanel();
    } catch (error) {
      refs.error.textContent = error.message;
    }
  });
}

if (refs.viewUsersBtn) {
  refs.viewUsersBtn.addEventListener("click", async () => {
    try {
      await openUsersPanel();
    } catch (error) {
      refs.error.textContent = error.message;
    }
  });
}

if (refs.viewAdminLogsBtn) {
  refs.viewAdminLogsBtn.addEventListener("click", () => {
    openAdminLogsPanel();
  });
}

if (refs.downloadLogsBtn) {
  refs.downloadLogsBtn.addEventListener("click", downloadAdminLogs);
}

if (refs.datahubIngestBtn) {
  refs.datahubIngestBtn.addEventListener("click", uploadDatahubFile);
}

if (refs.datahubIngestFile) {
  refs.datahubIngestFile.addEventListener("change", async () => {
    try {
      await buildIngestPreview();
      if (ingestPreviewState?.validation?.invalidCount > 0) {
        setFormMessage(refs.datahubIngestMsg, "Pré-validação encontrou erros no arquivo. Corrija antes de enviar.", "error");
      } else if (ingestPreviewState?.validation?.total > 0) {
        setFormMessage(refs.datahubIngestMsg, "Arquivo validado com sucesso. Pronto para envio.", "success");
      }
    } catch (error) {
      setFormMessage(refs.datahubIngestMsg, error.message, "error");
      ingestPreviewState = null;
      renderIngestPreview([], { total: 0, invalidCount: 0 });
    }
  });
}

if (refs.datahubIngestTarget) {
  refs.datahubIngestTarget.addEventListener("change", async () => {
    if (refs.datahubIngestFile) {
      refs.datahubIngestFile.accept = refs.datahubIngestTarget.value === "observations"
        ? ".json,.csv"
        : ".json,.csv,.xml";
    }

    if (refs.datahubIngestFile?.files?.[0]) {
      try {
        await buildIngestPreview();
      } catch (error) {
        setFormMessage(refs.datahubIngestMsg, error.message, "error");
      }
    } else {
      ingestPreviewState = null;
      renderIngestPreview([], { total: 0, invalidCount: 0 });
    }
  });
}

if (refs.datahubExportBtn) {
  refs.datahubExportBtn.addEventListener("click", downloadDatahubTable);
}

if (refs.sidebarToggleBtn) {
  refs.sidebarToggleBtn.addEventListener("click", toggleSidebar);
}

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

refs.mapStationsList.addEventListener("click", async (event) => {
  const item = event.target.closest(".map-station-item");
  if (!item) {
    return;
  }

  const stationId = item.dataset.stationId;
  const hasLocation = item.dataset.hasLocation === "true";
  if (refs.stationSelect) {
    refs.stationSelect.value = stationId;
  }
  highlightMapStationInList(stationId);

  if (!hasLocation) {
    showMapInsight();
    setMapInsight(item.querySelector(".map-station-name")?.textContent || "Detalhes da estação", NaN, NaN, "Último dado: indisponível (sem localização)");
    return;
  }

  try {
    await renderStationsMap(stationId);
    focusStationOnMap(stationId);
  } catch (error) {
    refs.error.textContent = error.message;
  }
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
  setDownloadPdfButtonLoading(false);
  setDownloadLogsButtonLoading(false);
  setActiveView("data");
  startSeriesAutoRefresh();

  try {
    await loadCurrentUserContext();
    await loadStations();
  } catch (error) {
    refs.error.textContent = error.message;
  }
})();
