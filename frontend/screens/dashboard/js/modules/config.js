export const TOKEN_KEY = "pw_access_token";
export const LOGIN_PAGE = "../login/index.html";
export const API_BASE = "http://127.0.0.1:5000";

export const VARIABLE_LABELS = {
  air_temperature: "Temperatura",
  air_humidity: "Umidade",
  air_pressure: "Pressão",
  wind_speed: "Velocidade do vento",
  wind_direction: "Direção do vento",
  rain_accumulated: "Precipitacao acumulada"
};

export const VARIABLE_UNITS = {
  air_temperature: "°C",
  air_humidity: "%",
  air_pressure: "hPa",
  wind_speed: "m/s",
  wind_direction: "°",
  rain_accumulated: "mm"
};

export const refs = {
  error: document.getElementById("dashboard-error"),
  breadcrumbText: document.getElementById("breadcrumb-text"),
  pageTitle: document.getElementById("page-title"),
  viewDataBtn: document.getElementById("view-data-btn"),
  viewMapBtn: document.getElementById("view-map-btn"),
  viewRegisterBtn: document.getElementById("view-register-btn"),
  dataPanel: document.getElementById("data-panel"),
  registerPanel: document.getElementById("register-panel"),
  dataControls: document.getElementById("data-controls"),
  mapControls: document.getElementById("map-controls"),
  registerControls: document.getElementById("register-controls"),
  viewContextText: document.getElementById("view-context-text"),
  stationMeta: document.getElementById("station-meta"),
  mapLayout: document.getElementById("map-layout"),
  stationSelect: document.getElementById("station-select"),
  stationLocationText: document.getElementById("station-location-text"),
  mapPanel: document.getElementById("stations-map-panel"),
  mapContainer: document.getElementById("stations-map"),
  mapInsightPanel: document.getElementById("map-insight-panel"),
  mapInsightName: document.getElementById("map-insight-name"),
  mapInsightCoords: document.getElementById("map-insight-coords"),
  mapInsightLatest: document.getElementById("map-insight-latest"),
  mapStationsList: document.getElementById("map-stations-list"),
  variableSelect: document.getElementById("variable-select"),
  startDate: document.getElementById("start-date"),
  endDate: document.getElementById("end-date"),
  searchBtn: document.getElementById("search-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  userMenuBtn: document.getElementById("user-menu-btn"),
  userMenuPanel: document.getElementById("user-menu-panel"),
  chartTitle: document.getElementById("chart-title"),
  chartSubtitle: document.getElementById("chart-subtitle"),
  chartEmptyState: document.getElementById("chart-empty-state"),
  chartCanvas: document.getElementById("observations-chart"),
  summaryGrid: document.getElementById("summary-grid"),
  previewMapContainer: document.getElementById("station-preview-map"),
  previewMapEmpty: document.getElementById("station-preview-empty"),
  latestTableBody: document.getElementById("latest-table-body"),
  registerDeviceForm: document.getElementById("register-device-form"),
  registerDeviceName: document.getElementById("register-device-name"),
  registerDeviceMsg: document.getElementById("register-device-msg"),
  registerLocationForm: document.getElementById("register-location-form"),
  registerLocationDevice: document.getElementById("register-location-device"),
  registerLocationLat: document.getElementById("register-location-lat"),
  registerLocationLon: document.getElementById("register-location-lon"),
  registerLocationMsg: document.getElementById("register-location-msg"),
  registerUserForm: document.getElementById("register-user-form"),
  registerUserName: document.getElementById("register-user-name"),
  registerUserEmail: document.getElementById("register-user-email"),
  registerUserPassword: document.getElementById("register-user-password"),
  registerUserMsg: document.getElementById("register-user-msg")
};

export const state = {
  devices: [],
  chart: null,
  locationByDeviceId: {},
  map: null,
  mapMarkersLayer: null,
  previewMap: null,
  previewMarker: null,
  latestObservationByDeviceId: {},
  markerByDeviceId: {},
  currentObservations: []
};
