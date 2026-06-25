const REQUIRED_FIELDS = [
  "location_id",
  "location_name",
  "service_type",
  "city",
  "state_province",
  "country",
];

const SERVICE_TYPES = {
  vision_clinic_programming: "Vision Clinic Programming",
  non_vision_clinic_programming: "Non-Vision Clinic Programming",
  voucher: "Voucher",
};

const SERVICE_ICONS = {
  vision_clinic_programming: "../img/directicon.png",
  non_vision_clinic_programming: "../img/indirect.png",
  voucher: "../img/vouchericon.png",
};

const NORTH_AMERICA_PRESENTATION_CENTER = [42.5, -97];
const NORTH_AMERICA_PRESENTATION_ZOOM = 4.55;

const TEMPLATE_COLUMNS = [
  "location_id",
  "location_name",
  "service_type",
  "latitude",
  "longitude",
  "city",
  "state_province",
  "country",
  "program_name",
  "partner_name",
  "address",
  "postal_code",
  "start_date",
  "end_date",
  "reporting_period",
  "active_status",
  "notes",
  "is_enriched",
  "enriched_by",
  "enriched_at",
  "data_confidence",
  "source",
  "salesforce_id",
  "record_type",
  "avg_orders_per_year",
  "orders_ytd",
  "needs_manual_id",
  "wearers_ytd",
  "lives_served",
  "target_lives_served",
  "clinic_uid",
  "sap_store",
];

const SAMPLE_CSV = `location_id,location_name,service_type,latitude,longitude,city,state_province,country,program_name,partner_name,reporting_period,active_status,notes
DS-001,Chicago Community Vision Clinic,vision_clinic_programming,41.8781,-87.6298,Chicago,IL,United States,Mobile Clinic,,H1 2026,Active,School and community clinic
DS-002,Los Angeles Mobile Clinic,vision_clinic_programming,34.0522,-118.2437,Los Angeles,CA,United States,Mobile Clinic,,H1 2026,Active,Multi-day direct service event
DS-003,Toronto School Vision Day,vision_clinic_programming,43.6532,-79.3832,Toronto,ON,Canada,School Vision,,H1 2026,Active,School-based event
IS-001,Denver Partner Fulfillment,non_vision_clinic_programming,39.7392,-104.9903,Denver,CO,United States,Champions for Sight,Front Range Outreach,H1 2026,Active,Partner-delivered service
IS-002,Atlanta CLTL Network,non_vision_clinic_programming,33.7490,-84.3880,Atlanta,GA,United States,CLTL,Southeast Health Alliance,H1 2026,Active,Network partner access
IS-003,Montreal Donation Access,non_vision_clinic_programming,45.5017,-73.5673,Montreal,QC,Canada,Donation Access,Vision Care Collective,H1 2026,Active,Donation-supported access
VS-001,Dallas Voucher Store,voucher,32.7767,-96.7970,Dallas,TX,United States,Voucher Access,Retail Partner A,H1 2026,Active,Active redemption store
VS-002,Phoenix Voucher Store,voucher,33.4484,-112.0740,Phoenix,AZ,United States,Voucher Access,Retail Partner B,H1 2026,Active,Active redemption store
VS-003,Vancouver Voucher Store,voucher,49.2827,-123.1207,Vancouver,BC,Canada,Voucher Access,Retail Partner C,H1 2026,Active,Active redemption store
VS-004,San Juan Voucher Store,voucher,18.4655,-66.1057,San Juan,PR,United States,Voucher Access,Retail Partner D,H1 2026,Active,Active redemption store`;

const GEOCODE_CACHE_KEY = "onesight-geocode-cache-v1";
const SESSION_STORAGE_KEY = "onesight-service-locations-session-v1";
const DEFAULT_DATA_URL = "../data/service_locations.csv";

let validRecords = [];
let filteredRecords = [];
let allRecords = [];
let coordinateQueue = [];
let warnings = [];
let markerGroup;
let heatLayer = null;
let heatVisible = false;
let markersVisible = true;
const showAdmin = new URLSearchParams(window.location.search).get("showadmin") === "true";
const appShell = document.getElementById("appShell");

if (!showAdmin) {
  appShell.classList.add("admin-hidden");
}

const map = L.map("map", {
  zoomControl: true,
  minZoom: 2,
  zoomSnap: 0.25,
  zoomDelta: 0.25,
  worldCopyJump: false,
}).setView(NORTH_AMERICA_PRESENTATION_CENTER, NORTH_AMERICA_PRESENTATION_ZOOM);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  maxZoom: 19,
  noWrap: true,
}).addTo(map);

markerGroup = createClusterGroup();
map.addLayer(markerGroup);

const elements = {
  appShell,
  csvFile: document.getElementById("csvFile"),
  loadSampleBtn: document.getElementById("loadSampleBtn"),
  downloadTemplateBtn: document.getElementById("downloadTemplateBtn"),
  statusMessage: document.getElementById("statusMessage"),
  warningDetails: document.getElementById("warningDetails"),
  warningCount: document.getElementById("warningCount"),
  warningList: document.getElementById("warningList"),
  cleanupStatus: document.getElementById("cleanupStatus"),
  cleanupTableBody: document.getElementById("cleanupTableBody"),
  cleanupTableWrap: document.querySelector(".cleanup-table-wrap"),
  geoapifyKey: document.getElementById("geoapifyKey"),
  geocodeLimit: document.getElementById("geocodeLimit"),
  geocodeMissingBtn: document.getElementById("geocodeMissingBtn"),
  exportEnrichedBtn: document.getElementById("exportEnrichedBtn"),
  clearGeocodeCacheBtn: document.getElementById("clearGeocodeCacheBtn"),
  serviceTypeInputs: Array.from(document.querySelectorAll('input[name="serviceType"]')),
  legendToggles: Array.from(document.querySelectorAll(".legend-toggle")),
  countryFilter: document.getElementById("countryFilter"),
  stateFilter: document.getElementById("stateFilter"),
  periodFilter: document.getElementById("periodFilter"),
  programFilter: document.getElementById("programFilter"),
  partnerFilter: document.getElementById("partnerFilter"),
  statusFilter: document.getElementById("statusFilter"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  markersToggleBtn: document.getElementById("markersToggleBtn"),
  heatToggleBtn: document.getElementById("heatToggleBtn"),
  presentationBtn: document.getElementById("presentationBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  printBtn: document.getElementById("printBtn"),
  emptyState: document.getElementById("emptyState"),
};

elements.csvFile.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
    complete: (results) => handleParsedCsv(results, file.name),
    error: () => showCriticalError("The CSV could not be read. Please check the file and try again."),
  });
});

elements.loadSampleBtn.addEventListener("click", () => {
  Papa.parse(SAMPLE_CSV, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
    complete: (results) => handleParsedCsv(results, "sample data"),
    error: () => showCriticalError("The sample data could not be loaded."),
  });
});

elements.downloadTemplateBtn.addEventListener("click", () => {
  downloadCsv("service_locations_template.csv", `${TEMPLATE_COLUMNS.join(",")}\n`);
});

elements.resetFiltersBtn.addEventListener("click", () => {
  elements.serviceTypeInputs.forEach((input) => {
    input.checked = true;
  });
  [elements.countryFilter, elements.stateFilter, elements.periodFilter, elements.programFilter, elements.partnerFilter, elements.statusFilter].forEach(
    (select) => {
      select.value = "all";
    },
  );
  syncLegendFromInputs();
  applyFilters();
});

// Legend doubles as a service-type filter for non-admins (the admin checkboxes
// stay the source of truth so both stay in sync).
elements.legendToggles.forEach((button) => {
  button.addEventListener("click", () => {
    const input = elements.serviceTypeInputs.find((item) => item.value === button.dataset.serviceType);
    if (input) input.checked = !input.checked;
    syncLegendFromInputs();
    applyFilters();
  });
});

function syncLegendFromInputs() {
  elements.legendToggles.forEach((button) => {
    const input = elements.serviceTypeInputs.find((item) => item.value === button.dataset.serviceType);
    button.setAttribute("aria-pressed", String(input ? input.checked : true));
  });
}

elements.exportCsvBtn.addEventListener("click", () => {
  if (!filteredRecords.length) return;
  const csv = Papa.unparse(filteredRecords.map((record) => record.original));
  downloadCsv("filtered_service_locations.csv", csv);
});

elements.exportEnrichedBtn.addEventListener("click", () => {
  if (!allRecords.length) return;
  downloadCsv("service_locations_enriched.csv", Papa.unparse(allRecords.map((record) => record.original)));
});

elements.clearGeocodeCacheBtn.addEventListener("click", () => {
  localStorage.removeItem(GEOCODE_CACHE_KEY);
  setCleanupStatus("Saved geocode cache cleared.");
});

elements.geocodeMissingBtn.addEventListener("click", () => {
  geocodeMissingRows();
});

elements.cleanupTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-row-number]");
  if (!button) return;
  applyManualCoordinates(Number(button.dataset.rowNumber));
});

elements.markersToggleBtn?.addEventListener("click", () => {
  markersVisible = !markersVisible;
  elements.markersToggleBtn.classList.toggle("is-active", markersVisible);
  elements.markersToggleBtn.setAttribute("aria-pressed", String(markersVisible));
  elements.markersToggleBtn.setAttribute("aria-checked", String(markersVisible));
  if (markersVisible) {
    map.addLayer(markerGroup);
  } else {
    map.removeLayer(markerGroup);
  }
});

elements.heatToggleBtn?.addEventListener("click", () => {
  if (!heatVisible && typeof L.heatLayer !== "function") {
    elements.heatToggleBtn.title = "Heat map library failed to load.";
    return;
  }
  heatVisible = !heatVisible;
  elements.heatToggleBtn.classList.toggle("is-active", heatVisible);
  elements.heatToggleBtn.setAttribute("aria-pressed", String(heatVisible));
  elements.heatToggleBtn.setAttribute("aria-checked", String(heatVisible));
  renderHeat();
});

elements.presentationBtn.addEventListener("click", () => {
  elements.appShell.classList.toggle("presentation-mode");
  setTimeout(refreshMapView, 220);
});

elements.fullscreenBtn.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await elements.appShell.requestFullscreen?.();
  } else {
    await document.exitFullscreen?.();
  }
  setTimeout(refreshMapView, 220);
});

elements.printBtn.addEventListener("click", () => window.print());

[
  ...elements.serviceTypeInputs,
  elements.countryFilter,
  elements.stateFilter,
  elements.periodFilter,
  elements.programFilter,
  elements.partnerFilter,
  elements.statusFilter,
].forEach((control) => control.addEventListener("change", applyFilters));

elements.serviceTypeInputs.forEach((input) => input.addEventListener("change", syncLegendFromInputs));
syncLegendFromInputs();

window.addEventListener("resize", () => {
  map.invalidateSize();
});

map.on("zoomend", () => {
  if (heatVisible && heatLayer) {
    heatLayer.setOptions(computeHeatRadius());
  }
});

loadInitialData();

function createClusterGroup() {
  return L.markerClusterGroup({
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    disableClusteringAtZoom: 14,
    maxClusterRadius: 46,
    iconCreateFunction: (cluster) => {
      const clusterRecords = cluster.getAllChildMarkers().flatMap((marker) => marker.options.records || []);
      const count = clusterRecords.length || cluster.getChildCount();
      const serviceCounts = countServiceTypes(clusterRecords);
      return L.divIcon({
        html: makeClusterHtml(count, serviceCounts),
        className: "cluster-wrapper",
        iconSize: [count >= 50 ? 52 : 42, count >= 50 ? 52 : 42],
      });
    },
  });
}

function handleParsedCsv(results, sourceName) {
  warnings = [];
  const rows = results.data || [];
  const fields = (results.meta?.fields || []).map(normalizeHeader);

  if (results.errors?.length) {
    warnings.push(...results.errors.slice(0, 10).map((error) => `Row ${error.row + 1}: ${error.message}`));
  }

  if (!rows.length) {
    allRecords = [];
    validRecords = [];
    coordinateQueue = [];
    showCriticalError("The CSV is empty. Please upload a file with service locations.");
    renderWarnings();
    renderCleanupPanel();
    renderMap();
    return;
  }

  const missingColumns = REQUIRED_FIELDS.filter((field) => !fields.includes(field));
  if (missingColumns.length) {
    allRecords = [];
    validRecords = [];
    coordinateQueue = [];
    showCriticalError(`Missing required column(s): ${missingColumns.join(", ")}.`);
    renderWarnings();
    renderCleanupPanel();
    renderMap();
    return;
  }

  allRecords = [];
  validRecords = [];
  coordinateQueue = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const validation = validateRow(row, rowNumber);
    if (validation.errors.length) {
      warnings.push(`Row ${rowNumber}: ${validation.errors.join("; ")}.`);
      return;
    }
    allRecords.push(validation.record);
    if (validation.record.hasCoordinates) {
      validRecords.push(validation.record);
      return;
    }
    coordinateQueue.push(validation.record);
    warnings.push(`Row ${rowNumber}: missing coordinates; queued for cleanup.`);
  });

  buildFilterOptions();
  applyFilters();

  const skipped = rows.length - allRecords.length;
  const queued = coordinateQueue.length;
  const message = `${rows.length.toLocaleString()} rows loaded from ${sourceName}. ${validRecords.length.toLocaleString()} locations rendered.${queued ? ` ${queued.toLocaleString()} row(s) need coordinates.` : ""}${skipped ? ` ${skipped.toLocaleString()} row(s) skipped.` : ""}`;
  elements.statusMessage.className = `status-message${skipped || queued ? " warning" : ""}`;
  elements.statusMessage.textContent = message;
  renderWarnings();
  renderCleanupPanel();
  saveCurrentSession();
}

function validateRow(row, rowNumber) {
  const errors = [];
  const cleaned = {};

  REQUIRED_FIELDS.forEach((field) => {
    cleaned[field] = getValue(row, field);
    if (!cleaned[field]) errors.push(`missing ${field}`);
  });
  cleaned.latitude = getValue(row, "latitude");
  cleaned.longitude = getValue(row, "longitude");

  if (cleaned.service_type && !SERVICE_TYPES[cleaned.service_type]) {
    errors.push(`invalid service_type "${cleaned.service_type}"`);
  }

  const latitude = Number(cleaned.latitude);
  const longitude = Number(cleaned.longitude);
  const hasLatitude = cleaned.latitude !== "";
  const hasLongitude = cleaned.longitude !== "";
  const hasCoordinates =
    hasLatitude &&
    hasLongitude &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180;

  if ((hasLatitude || hasLongitude) && !hasCoordinates) {
    errors.push("invalid latitude/longitude");
  }

  const original = {};
  Object.keys(row).forEach((key) => {
    original[normalizeHeader(key)] = typeof row[key] === "string" ? row[key].trim() : row[key];
  });
  ensureExportColumns(original);

  return {
    errors,
    record: {
      ...original,
      row_number: rowNumber,
      location_id: cleaned.location_id,
      location_name: cleaned.location_name,
      service_type: cleaned.service_type,
      latitude: hasCoordinates ? latitude : null,
      longitude: hasCoordinates ? longitude : null,
      city: cleaned.city,
      state_province: cleaned.state_province,
      country: cleaned.country,
      hasCoordinates,
      original,
    },
  };
}

function buildFilterOptions() {
  setSelectOptions(elements.countryFilter, "All countries", uniqueValues("country"));
  setSelectOptions(elements.stateFilter, "All states/provinces", uniqueValues("state_province"));
  setSelectOptions(elements.periodFilter, "All periods", uniqueValues("reporting_period"));
  setSelectOptions(elements.programFilter, "All programs", uniqueValues("program_name"));
  setSelectOptions(elements.partnerFilter, "All partners", uniqueValues("partner_name"));
  setSelectOptions(elements.statusFilter, "All statuses", uniqueValues("active_status"));
}

function uniqueValues(field) {
  return [...new Set(validRecords.map((record) => getValue(record, field)).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function setSelectOptions(select, allLabel, values) {
  const current = select.value;
  select.innerHTML = "";
  select.append(new Option(allLabel, "all"));
  values.forEach((value) => select.append(new Option(value, value)));
  select.value = values.includes(current) ? current : "all";
}

function applyFilters() {
  const selectedTypes = new Set(elements.serviceTypeInputs.filter((input) => input.checked).map((input) => input.value));
  filteredRecords = validRecords.filter((record) => {
    return (
      selectedTypes.has(record.service_type) &&
      matchesSelect(record, "country", elements.countryFilter.value) &&
      matchesSelect(record, "state_province", elements.stateFilter.value) &&
      matchesSelect(record, "reporting_period", elements.periodFilter.value) &&
      matchesSelect(record, "program_name", elements.programFilter.value) &&
      matchesSelect(record, "partner_name", elements.partnerFilter.value) &&
      matchesSelect(record, "active_status", elements.statusFilter.value)
    );
  });

  renderMap();
  renderSummary();
}

function matchesSelect(record, field, selectedValue) {
  return selectedValue === "all" || getValue(record, field) === selectedValue;
}

function renderMap() {
  markerGroup.clearLayers();
  elements.emptyState.classList.toggle("is-visible", validRecords.length > 0 && filteredRecords.length === 0);

  const groupedByCoordinate = groupRecordsByCoordinate(filteredRecords);
  groupedByCoordinate.forEach((records) => {
    const lead = records[0];
    const marker = L.marker([lead.latitude, lead.longitude], {
      icon: makeMarkerIcon(lead.service_type, records),
      title: lead.location_name,
      records,
    }).bindPopup(makePopup(records), { maxWidth: 340 });
    markerGroup.addLayer(marker);
  });

  renderHeat();
  fitVisibleRecords(true);
}

function renderHeat() {
  if (heatLayer) {
    map.removeLayer(heatLayer);
    heatLayer = null;
  }
  if (!heatVisible || typeof L.heatLayer !== "function") return;

  const points = filteredRecords
    .map((record) => {
      const weight = Number(getValue(record, "wearers_ytd"));
      if (!Number.isFinite(weight) || weight <= 0) return null;
      return [record.latitude, record.longitude, weight];
    })
    .filter(Boolean);

  if (!points.length) return;

  const maxWeight = points.reduce((max, point) => Math.max(max, point[2]), 0) || 1;
  const { radius, blur } = computeHeatRadius();
  heatLayer = L.heatLayer(points, {
    radius,
    blur,
    minOpacity: 0.3,
    max: maxWeight,
  });
  heatLayer.addTo(map);
}

// Each point should represent a constant real-world footprint (~60 miles) so the
// heat map reads the same regardless of zoom. Convert that distance to pixels at
// the current zoom/latitude and clamp so it never vanishes or fills the screen.
const HEAT_RADIUS_METERS = 96000;

function computeHeatRadius() {
  const latitude = map.getCenter().lat;
  const metersPerPixel = (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** map.getZoom();
  const radius = Math.min(70, Math.max(6, Math.round(HEAT_RADIUS_METERS / metersPerPixel)));
  return { radius, blur: Math.round(radius * 0.7) };
}

function refreshMapView() {
  map.invalidateSize();
  fitVisibleRecords(false);
}

function fitVisibleRecords(animate) {
  map.setView(NORTH_AMERICA_PRESENTATION_CENTER, NORTH_AMERICA_PRESENTATION_ZOOM, { animate });
}

function groupRecordsByCoordinate(records) {
  const groups = new Map();
  records.forEach((record) => {
    const key = `${record.latitude.toFixed(6)},${record.longitude.toFixed(6)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  });
  return [...groups.values()];
}

function makeMarkerIcon(serviceType, records = []) {
  const serviceCounts = countServiceTypes(records);
  const activeTypes = getActiveServiceTypes(serviceCounts);
  if (records.length > 1 || activeTypes.length > 1) {
    const size = records.length >= 10 ? 46 : 42;
    return L.divIcon({
      className: "service-marker-wrapper",
      html: makeMixedMarkerHtml(records.length, serviceCounts),
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  }

  const size = serviceType === "vision_clinic_programming" ? [38, 52] : serviceType === "non_vision_clinic_programming" ? [36, 50] : [36, 50];
  return L.divIcon({
    className: "service-marker-wrapper",
    html: `<img class="service-marker ${serviceType}" src="${SERVICE_ICONS[serviceType]}" alt="" aria-hidden="true" />`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  });
}

function makePopup(records) {
  const groupNote = records.length > 1 ? makeLocationSummary(records) : "";
  return `<div class="popup">${groupNote}${records.map(makeRecordPopup).join("<hr>")}</div>`;
}

function makeLocationSummary(records) {
  const serviceCounts = countServiceTypes(records);
  return `
    <div class="location-summary">
      <strong>${records.length} records at this location</strong>
      <div>${formatServiceSummary(serviceCounts)}</div>
    </div>
  `;
}

function makeRecordPopup(record) {
  const location = [record.city, record.state_province, record.country].filter(Boolean).join(", ");
  let fields;

  if (record.service_type === "non_vision_clinic_programming") {
    fields = [
      ["Type", SERVICE_TYPES[record.service_type]],
      ["Record Type", getValue(record, "record_type")],
      ["Avg Orders / Year", formatOrders(getValue(record, "avg_orders_per_year"))],
      ["Orders YTD", formatOrders(getValue(record, "orders_ytd"))],
      ["Location", location],
      ["Notes", getValue(record, "notes")],
    ];
  } else if (record.service_type === "vision_clinic_programming") {
    const wearers = getValue(record, "wearers_ytd");
    // Show actual wearers once a clinic has served; until then show the target.
    const wearersLine =
      wearers !== ""
        ? ["Wearers Served", formatOrders(wearers)]
        : ["Target Lives Served", formatOrders(getValue(record, "target_lives_served"))];
    fields = [
      ["Type", SERVICE_TYPES[record.service_type]],
      ["Status", getValue(record, "active_status")],
      ["Clinic Date", formatDateRange(getValue(record, "start_date"), getValue(record, "end_date"))],
      wearersLine,
      ["Partner", getValue(record, "partner_name")],
      ["Location", location],
    ];
  } else if (record.service_type === "voucher") {
    fields = [
      ["Type", SERVICE_TYPES[record.service_type]],
      ["Brand", getValue(record, "partner_name")],
      ["Vouchers 2026", formatOrders(getValue(record, "wearers_ytd"))],
      ["Location", location],
    ];
  } else {
    fields = [
      ["Type", SERVICE_TYPES[record.service_type]],
      ["Program", getValue(record, "program_name")],
      ["Partner", getValue(record, "partner_name")],
      ["Location", location],
      ["Notes", getValue(record, "notes")],
    ];
  }

  fields = fields.filter(([, value]) => value !== "");

  return `
    <h3>${escapeHtml(record.location_name)}</h3>
    <dl>
      ${fields.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}
    </dl>
  `;
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return `${Number(match[2])}/${Number(match[3])}/${match[1]}`;
}

function formatDateRange(start, end) {
  const startText = formatDate(start);
  if (!startText) return "";
  const endText = formatDate(end);
  return endText && endText !== startText ? `${startText} – ${endText}` : startText;
}

function formatOrders(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return number.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function countServiceTypes(records) {
  return records.reduce(
    (counts, record) => {
      if (counts[record.service_type] !== undefined) counts[record.service_type] += 1;
      return counts;
    },
    {
      vision_clinic_programming: 0,
      non_vision_clinic_programming: 0,
      voucher: 0,
    },
  );
}

function getActiveServiceTypes(serviceCounts) {
  return Object.keys(SERVICE_TYPES).filter((serviceType) => serviceCounts[serviceType] > 0);
}

function formatServiceSummary(serviceCounts) {
  return getActiveServiceTypes(serviceCounts)
    .map((serviceType) => `${SERVICE_TYPES[serviceType]}: ${serviceCounts[serviceType]}`)
    .join(" | ");
}

function makeMixedMarkerHtml(count, serviceCounts) {
  return `
    <span class="mixed-service-marker" aria-hidden="true">
      <span class="mixed-ring">${makeServiceSegments(serviceCounts)}</span>
      <span class="mixed-count">${count}</span>
    </span>
  `;
}

function makeClusterHtml(count, serviceCounts) {
  return `
    <div class="service-cluster ${count >= 50 ? "large" : ""}">
      <span class="cluster-count">${count}</span>
      <span class="cluster-mix">${makeServiceSegments(serviceCounts)}</span>
    </div>
  `;
}

function makeServiceSegments(serviceCounts) {
  return getActiveServiceTypes(serviceCounts)
    .map((serviceType) => `<span class="service-segment ${serviceType}"></span>`)
    .join("");
}

function renderSummary() {
}

function renderCleanupPanel() {
  const queueCount = coordinateQueue.length;
  if (!allRecords.length) {
    setCleanupStatus("No CSV loaded.");
  } else if (!queueCount) {
    setCleanupStatus("All loaded rows have coordinates.");
  } else {
    setCleanupStatus(`${queueCount.toLocaleString()} row(s) need coordinates. Edit them manually or geocode a small batch.`, "warning");
  }

  elements.cleanupTableWrap.classList.toggle("has-rows", queueCount > 0);
  elements.cleanupTableBody.innerHTML = "";
  coordinateQueue.slice(0, 75).forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${escapeHtml(record.location_name)}</strong><br><span class="lookup-text">${escapeHtml(SERVICE_TYPES[record.service_type])}</span></td>
      <td class="lookup-text">${escapeHtml(buildGeocodeQuery(record))}</td>
      <td><input data-lat-row="${record.row_number}" inputmode="decimal" placeholder="lat" /></td>
      <td><input data-lon-row="${record.row_number}" inputmode="decimal" placeholder="lon" /></td>
      <td class="lookup-text">${escapeHtml(getValue(record.original, "enriched_by") || "Needs coordinates")}</td>
      <td><button type="button" data-row-number="${record.row_number}">Save</button></td>
    `;
    elements.cleanupTableBody.append(row);
  });

  if (queueCount > 75) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5">${(queueCount - 75).toLocaleString()} additional row(s) hidden. Export still includes all loaded rows.</td>`;
    elements.cleanupTableBody.append(row);
  }
}

function setCleanupStatus(message, tone = "") {
  elements.cleanupStatus.className = `cleanup-status${tone ? ` ${tone}` : ""}`;
  elements.cleanupStatus.textContent = message;
}

function applyManualCoordinates(rowNumber) {
  const record = allRecords.find((item) => item.row_number === rowNumber);
  const latitude = Number(document.querySelector(`[data-lat-row="${rowNumber}"]`)?.value);
  const longitude = Number(document.querySelector(`[data-lon-row="${rowNumber}"]`)?.value);

  if (!record || !isValidCoordinate(latitude, longitude)) {
    setCleanupStatus("Enter a valid latitude and longitude before saving.", "error");
    return;
  }

  updateRecordCoordinates(record, latitude, longitude, "manual");
  refreshDataAfterCoordinateUpdates();
  setCleanupStatus(`Coordinates saved for ${record.location_name}.`);
}

async function geocodeMissingRows() {
  const limit = Number(elements.geocodeLimit.value) || 5;
  const records = coordinateQueue.slice(0, limit);
  const apiKey = elements.geoapifyKey.value.trim();
  const cache = readGeocodeCache();
  let resolved = 0;
  let apiCalls = 0;
  let failed = 0;

  if (!records.length) {
    setCleanupStatus("All loaded rows already have coordinates.");
    return;
  }

  elements.geocodeMissingBtn.disabled = true;
  setCleanupStatus(`Checking ${records.length} row(s). Cached results are used before any API calls.`, "warning");

  for (const record of records) {
    const query = buildGeocodeQuery(record);
    const cacheKey = normalizeCacheKey(query);

    if (!query) {
      failed += 1;
      continue;
    }

    if (cache[cacheKey]) {
      updateRecordCoordinates(record, cache[cacheKey].latitude, cache[cacheKey].longitude, "cached_geocode");
      resolved += 1;
      continue;
    }

    if (!apiKey) {
      failed += 1;
      continue;
    }

    try {
      apiCalls += 1;
      const result = await fetchGeoapifyCoordinate(query, apiKey);
      if (!result) {
        failed += 1;
        continue;
      }
      cache[cacheKey] = result;
      updateRecordCoordinates(record, result.latitude, result.longitude, "geoapify");
      resolved += 1;
      await delay(1200);
    } catch {
      failed += 1;
    }
  }

  writeGeocodeCache(cache);
  refreshDataAfterCoordinateUpdates();
  const keyNote = apiKey ? `${apiCalls} API call(s) used.` : "No API key entered, so only cached matches were used.";
  setCleanupStatus(`${resolved} row(s) resolved. ${failed} row(s) still need coordinates. ${keyNote}`, failed ? "warning" : "");
  elements.geocodeMissingBtn.disabled = false;
}

async function fetchGeoapifyCoordinate(query, apiKey) {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&limit=1&apiKey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Geocode request failed");
  const data = await response.json();
  const feature = data.features?.[0];
  const latitude = Number(feature?.properties?.lat ?? feature?.geometry?.coordinates?.[1]);
  const longitude = Number(feature?.properties?.lon ?? feature?.geometry?.coordinates?.[0]);
  if (!isValidCoordinate(latitude, longitude)) return null;
  return { latitude, longitude };
}

function refreshDataAfterCoordinateUpdates() {
  recomputeCoordinateBuckets();
  buildFilterOptions();
  applyFilters();
  renderCleanupPanel();
  saveCurrentSession();
}

function recomputeCoordinateBuckets() {
  validRecords = allRecords.filter((record) => record.hasCoordinates);
  coordinateQueue = allRecords.filter((record) => !record.hasCoordinates);
}

function updateRecordCoordinates(record, latitude, longitude, source) {
  const wasMissingCoordinates = !record.hasCoordinates;
  record.latitude = latitude;
  record.longitude = longitude;
  record.hasCoordinates = true;
  record.original.latitude = roundCoordinate(latitude);
  record.original.longitude = roundCoordinate(longitude);
  record.original.is_enriched = wasMissingCoordinates ? "TRUE" : getValue(record.original, "is_enriched") || "";
  record.original.enriched_by = source;
  record.original.enriched_at = new Date().toISOString();
  if (!getValue(record.original, "data_confidence")) {
    record.original.data_confidence = source === "manual" ? "manual_coordinate" : "approximate_geocode";
  }
  const currentSource = getValue(record.original, "source");
  const sourceLabel = source === "manual" ? "Manual coordinate entry" : "Geoapify geocode";
  record.original.source = currentSource ? `${currentSource}; ${sourceLabel}` : sourceLabel;
}

function buildGeocodeQuery(record) {
  return [
    getValue(record, "address"),
    getValue(record, "city"),
    getValue(record, "state_province"),
    getValue(record, "postal_code"),
    getValue(record, "country"),
  ]
    .filter(Boolean)
    .join(", ");
}

function readGeocodeCache() {
  try {
    return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeGeocodeCache(cache) {
  localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
}

function normalizeCacheKey(query) {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function ensureExportColumns(original) {
  ["latitude", "longitude", "is_enriched", "enriched_by", "enriched_at", "data_confidence", "source"].forEach((field) => {
    if (!(field in original)) original[field] = "";
  });
}

function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function roundCoordinate(value) {
  return Number(value).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function loadInitialData() {
  const loadedDefault = await loadDefaultCsv();
  if (!loadedDefault && !restoreSavedSession()) {
    elements.loadSampleBtn.click();
  }
  setTimeout(refreshMapView, 250);
  setTimeout(refreshMapView, 900);
}

async function loadDefaultCsv() {
  try {
    const csv = await readTextFile(DEFAULT_DATA_URL);
    if (!csv.trim()) return false;
    Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: (results) => handleParsedCsv(results, DEFAULT_DATA_URL),
      error: () => false,
    });
    return true;
  } catch {
    return false;
  }
}

async function readTextFile(url) {
  if (typeof fetch === "function") {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return "";
    return response.text();
  }

  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("GET", `${url}?v=${Date.now()}`, true);
    request.onload = () => {
      resolve(request.status >= 200 && request.status < 300 ? request.responseText : "");
    };
    request.onerror = () => resolve("");
    request.send();
  });
}

function saveCurrentSession() {
  if (!allRecords.length) return;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(allRecords.map((record) => record.original)));
}

function restoreSavedSession() {
  try {
    const savedRows = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
    if (!Array.isArray(savedRows) || !savedRows.length) return false;
    Papa.parse(Papa.unparse(savedRows), {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
      complete: (results) => handleParsedCsv(results, "saved browser session"),
      error: () => elements.loadSampleBtn.click(),
    });
    return true;
  } catch {
    return false;
  }
}

function renderWarnings() {
  elements.warningCount.textContent = warnings.length.toLocaleString();
  elements.warningDetails.classList.toggle("has-warnings", warnings.length > 0);
  elements.warningList.innerHTML = "";
  warnings.slice(0, 100).forEach((warning) => {
    const item = document.createElement("li");
    item.textContent = warning;
    elements.warningList.append(item);
  });
  if (warnings.length > 100) {
    const item = document.createElement("li");
    item.textContent = `${warnings.length - 100} additional warning(s) hidden.`;
    elements.warningList.append(item);
  }
}

function showCriticalError(message) {
  elements.statusMessage.className = "status-message error";
  elements.statusMessage.textContent = message;
  filteredRecords = [];
  renderSummary();
}

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function getValue(record, field) {
  const value = record?.[field];
  return typeof value === "string" ? value.trim() : value ?? "";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
