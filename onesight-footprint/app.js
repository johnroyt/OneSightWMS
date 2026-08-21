const PROGRAM_MAP_API_URL = "https://holy-glitter-ebc0.operations-78f.workers.dev/program-map";

const SERVICE_TYPES = {
  retail_location: "Retail footprint",
  school_partner_location: "School-based partner",
  voucher_active_store: "Voucher (redeeming stores)",
  direct_service: "Vision clinic programming",
  indirect_service: "Non-vision clinic programming",
};

const PROGRAM_CATEGORIES = {
  onesight_programming: "OneSight Programming",
  school_based_partners: "School-Based Partners",
  el_support_locations: "EL Support Locations",
};

const SERVICE_ICONS = {
  voucher_active_store: "img/vouchericon.png",
  direct_service: "img/directicon.png",
  indirect_service: "img/indirect.png",
};

const NORTH_AMERICA_CENTER = [42.5, -97];
const NORTH_AMERICA_ZOOM = 4.55;
const FILTER_PANEL_STORAGE_KEY = "onesight-footprint-filter-panel-collapsed";

let allRecords = [];
let filteredRecords = [];

const elements = {
  appShell: document.getElementById("appShell"),
  map: document.getElementById("map"),
  statusMessage: document.getElementById("statusMessage"),
  summaryText: document.getElementById("summaryText"),
  emptyState: document.getElementById("emptyState"),
  refreshDataBtn: document.getElementById("refreshDataBtn"),
  collapseFiltersBtn: document.getElementById("collapseFiltersBtn"),
  showFiltersBtn: document.getElementById("showFiltersBtn"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  serviceTypeInputs: Array.from(document.querySelectorAll('input[name="serviceType"]')),
  programCategoryInputs: Array.from(document.querySelectorAll('input[name="programCategory"]')),
  countryFilter: document.getElementById("countryFilter"),
  stateFilter: document.getElementById("stateFilter"),
  programFilter: document.getElementById("programFilter"),
  organizationFilter: document.getElementById("organizationFilter"),
  statusFilter: document.getElementById("statusFilter"),
  retailBrandFilters: document.getElementById("retailBrandFilters"),
  presentationBtn: document.getElementById("presentationBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  printBtn: document.getElementById("printBtn"),
};

const map = L.map(elements.map, {
  zoomControl: true,
  minZoom: 2,
  zoomSnap: 0.25,
  zoomDelta: 0.25,
  worldCopyJump: false,
}).setView(NORTH_AMERICA_CENTER, NORTH_AMERICA_ZOOM);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  maxZoom: 19,
  noWrap: true,
}).addTo(map);

const markerGroup = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  disableClusteringAtZoom: 15,
  maxClusterRadius: 46,
  iconCreateFunction: (cluster) => {
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div class="live-cluster">${count.toLocaleString()}</div>`,
      className: "cluster-wrapper",
      iconSize: [44, 44],
    });
  },
});
map.addLayer(markerGroup);

elements.refreshDataBtn.addEventListener("click", () => loadPublishedData(true));
elements.collapseFiltersBtn.addEventListener("click", () => setFilterPanelCollapsed(true));
elements.showFiltersBtn.addEventListener("click", () => setFilterPanelCollapsed(false));
elements.resetFiltersBtn.addEventListener("click", resetFilters);
elements.presentationBtn.addEventListener("click", () => {
  elements.appShell.classList.toggle("presentation-mode");
  setTimeout(() => map.invalidateSize(), 180);
});
elements.fullscreenBtn.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await elements.appShell.requestFullscreen?.();
  } else {
    await document.exitFullscreen?.();
  }
  setTimeout(() => map.invalidateSize(), 180);
});
elements.printBtn.addEventListener("click", () => window.print());

[
  ...elements.programCategoryInputs,
  ...elements.serviceTypeInputs,
  elements.countryFilter,
  elements.stateFilter,
  elements.programFilter,
  elements.organizationFilter,
  elements.statusFilter,
].forEach((control) => control.addEventListener("change", applyFilters));

window.addEventListener("resize", () => map.invalidateSize());

let storedFilterPanelState = false;
try {
  storedFilterPanelState = localStorage.getItem(FILTER_PANEL_STORAGE_KEY) === "true";
} catch {
  storedFilterPanelState = false;
}
setFilterPanelCollapsed(storedFilterPanelState, false);
loadPublishedData(false);

function setFilterPanelCollapsed(collapsed, persist = true) {
  elements.appShell.classList.toggle("filters-collapsed", collapsed);
  elements.collapseFiltersBtn.setAttribute("aria-expanded", String(!collapsed));
  elements.showFiltersBtn.setAttribute("aria-expanded", String(!collapsed));
  if (persist) {
    try {
      localStorage.setItem(FILTER_PANEL_STORAGE_KEY, String(collapsed));
    } catch {
      // The panel still works when browser storage is unavailable.
    }
  }
  setTimeout(() => map.invalidateSize(), 180);
}

async function loadPublishedData(forceRefresh) {
  setStatus(forceRefresh ? "Refreshing published locations…" : "Loading published locations…");
  elements.refreshDataBtn.disabled = true;

  try {
    const url = forceRefresh ? `${PROGRAM_MAP_API_URL}?refresh=${Date.now()}` : PROGRAM_MAP_API_URL;
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !Array.isArray(payload.data)) {
      throw new Error(payload.message || "The published location service returned an invalid response.");
    }

    const normalized = payload.data.map(normalizeProgramMapRecord);
    allRecords = normalized.filter((record) => record.hasCoordinates);
    const skipped = normalized.length - allRecords.length;

    buildRetailBrandFilters();
    buildFilterOptions();
    applyFilters();
    setStatus(
      `${allRecords.length.toLocaleString()} published location${allRecords.length === 1 ? "" : "s"} loaded from Caspio${
        skipped ? `; ${skipped.toLocaleString()} skipped for invalid coordinates` : ""
      }.`
    );
  } catch (error) {
    allRecords = [];
    filteredRecords = [];
    markerGroup.clearLayers();
    elements.summaryText.textContent = "Published locations are temporarily unavailable.";
    elements.emptyState.classList.add("is-visible");
    setStatus(error.message || "Published locations could not be loaded.", "error");
  } finally {
    elements.refreshDataBtn.disabled = false;
    setTimeout(() => map.invalidateSize(), 150);
  }
}

function normalizeProgramMapRecord(row) {
  const latitude = Number(row.latitude);
  const longitude = Number(row.longitude);
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0);

  return {
    ...row,
    location_id: clean(row.map_point_id),
    location_name: clean(row.display_name) || clean(row.organization) || "Published location",
    program_category: classifyProgramCategory(row),
    service_type: classifyServiceType(row),
    partner_name: clean(row.organization),
    organization_display: clean(row.brand) || clean(row.organization),
    retail_brand: clean(row.brand) || clean(row.organization) || "Other EL locations",
    country_display: normalizeCountry(row.country, row.state_province),
    address: [clean(row.address_1), clean(row.address_2)].filter(Boolean).join(", "),
    latitude: hasCoordinates ? latitude : null,
    longitude: hasCoordinates ? longitude : null,
    hasCoordinates,
  };
}

function classifyProgramCategory(row) {
  const text = [
    row.service_model,
    row.program_name,
    row.point_type,
    row.record_kind,
    row.organization,
    row.brand,
  ]
    .map(clean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("kipp") ||
    text.includes("communities in schools") ||
    text.includes("school-based partner") ||
    text.includes("school based partner")
  ) {
    return "school_based_partners";
  }
  if (text.includes("voucher") || text.includes("redemption")) return "onesight_programming";
  if (text.includes("retail") || text.includes("store")) return "el_support_locations";
  return "onesight_programming";
}

function classifyServiceType(row) {
  const text = [row.service_model, row.program_name, row.point_type, row.record_kind]
    .map(clean)
    .join(" ")
    .toLowerCase();

  if (
    text.includes("kipp") ||
    text.includes("communities in schools") ||
    text.includes("school-based partner") ||
    text.includes("school based partner")
  ) {
    return "school_partner_location";
  }
  if (text.includes("voucher") || text.includes("redemption")) return "voucher_active_store";
  if (text.includes("retail") || text.includes("store")) return "retail_location";
  if (
    text.includes("cltl") ||
    text.includes("champions") ||
    text.includes("partner") ||
    text.includes("indirect") ||
    text.includes("nonprofit")
  ) {
    return "indirect_service";
  }
  if (text.includes("clinic") || text.includes("sales for sight") || text.includes("direct")) {
    return "direct_service";
  }
  return "indirect_service";
}

function normalizeCountry(country, stateProvince) {
  const value = clean(country);
  const region = clean(stateProvince).toUpperCase();
  if (value.toUpperCase() === "CAR" && region === "PR") return "Puerto Rico";
  if (value.toUpperCase() === "USA") return "United States";
  return value || "Unspecified";
}

function buildFilterOptions() {
  setOptions(elements.countryFilter, "All countries and territories", unique("country_display"));
  setOptions(elements.stateFilter, "All states/provinces", unique("state_province"));
  setOptions(elements.programFilter, "All programs", unique("program_name"));
  setOptions(elements.organizationFilter, "All brands and organizations", unique("organization_display"));
  setOptions(elements.statusFilter, "All statuses", unique("status"));
}

function buildRetailBrandFilters() {
  const existingInputs = Array.from(document.querySelectorAll('input[name="retailBrand"]'));
  const previousSelection = new Set(
    existingInputs.filter((input) => input.checked).map((input) => input.value)
  );
  const preserveSelection = existingInputs.length > 0;
  const brandCounts = allRecords
    .filter((record) => record.program_category === "el_support_locations")
    .reduce((counts, record) => {
      counts.set(record.retail_brand, (counts.get(record.retail_brand) || 0) + 1);
      return counts;
    }, new Map());

  elements.retailBrandFilters.replaceChildren();

  if (!brandCounts.size) {
    const note = document.createElement("div");
    note.className = "category-note";
    note.textContent = "No EL retail brands are currently published";
    elements.retailBrandFilters.append(note);
    return;
  }

  [...brandCounts.entries()]
    .sort(([brandA], [brandB]) => brandA.localeCompare(brandB))
    .forEach(([brand, count]) => {
      const label = document.createElement("label");
      label.className = "toggle retail brand-toggle";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "retailBrand";
      input.value = brand;
      input.checked = !preserveSelection || previousSelection.has(brand);
      input.addEventListener("change", applyFilters);

      const monogram = document.createElement("span");
      monogram.className = "brand-monogram";
      monogram.textContent = makeBrandMonogram(brand);
      monogram.setAttribute("aria-hidden", "true");

      const name = document.createElement("span");
      name.className = "brand-name";
      name.textContent = brand;

      const countElement = document.createElement("span");
      countElement.className = "brand-count";
      countElement.textContent = count.toLocaleString();
      countElement.setAttribute("aria-label", `${count.toLocaleString()} published locations`);

      label.append(input, monogram, name, countElement);
      elements.retailBrandFilters.append(label);
    });
}

function makeBrandMonogram(brand) {
  const words = clean(brand).split(/\s+/).filter(Boolean);
  if (!words.length) return "EL";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function unique(field) {
  return [...new Set(allRecords.map((record) => clean(record[field])).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

function setOptions(select, allLabel, values) {
  const previous = select.value;
  select.innerHTML = "";
  select.append(new Option(allLabel, "all"));
  values.forEach((value) => select.append(new Option(value, value)));
  select.value = values.includes(previous) ? previous : "all";
}

function resetFilters() {
  elements.programCategoryInputs.forEach((input) => {
    input.checked = true;
  });
  elements.serviceTypeInputs.forEach((input) => {
    input.checked = true;
  });
  document.querySelectorAll('input[name="retailBrand"]').forEach((input) => {
    input.checked = true;
  });
  [
    elements.countryFilter,
    elements.stateFilter,
    elements.programFilter,
    elements.organizationFilter,
    elements.statusFilter,
  ].forEach((select) => {
    select.value = "all";
  });
  applyFilters();
}

function applyFilters() {
  const selectedCategories = new Set(
    elements.programCategoryInputs.filter((input) => input.checked).map((input) => input.value)
  );
  const selectedTypes = new Set(
    elements.serviceTypeInputs.filter((input) => input.checked).map((input) => input.value)
  );
  const selectedRetailBrands = new Set(
    Array.from(document.querySelectorAll('input[name="retailBrand"]'))
      .filter((input) => input.checked)
      .map((input) => input.value)
  );

  filteredRecords = allRecords.filter((record) => {
    return (
      selectedCategories.has(record.program_category) &&
      (record.service_type === "school_partner_location" ||
        record.service_type === "retail_location" ||
        selectedTypes.has(record.service_type)) &&
      (record.service_type !== "retail_location" || selectedRetailBrands.has(record.retail_brand)) &&
      matches(record.country_display, elements.countryFilter.value) &&
      matches(record.state_province, elements.stateFilter.value) &&
      matches(record.program_name, elements.programFilter.value) &&
      matches(record.organization_display, elements.organizationFilter.value) &&
      matches(record.status, elements.statusFilter.value)
    );
  });

  renderMap();
  renderSummary();
}

function matches(value, selected) {
  return selected === "all" || clean(value) === selected;
}

function renderMap() {
  markerGroup.clearLayers();

  filteredRecords.forEach((record) => {
    const marker = L.marker([record.latitude, record.longitude], {
      icon: makeMarkerIcon(record.service_type),
      title: record.location_name,
    }).bindPopup(makePopup(record), { maxWidth: 350 });
    markerGroup.addLayer(marker);
  });

  elements.emptyState.classList.toggle("is-visible", allRecords.length > 0 && filteredRecords.length === 0);
  map.setView(NORTH_AMERICA_CENTER, NORTH_AMERICA_ZOOM, { animate: false });
}

function makeMarkerIcon(serviceType) {
  if (serviceType === "retail_location") {
    return L.divIcon({
      html: '<div class="retail-map-marker" aria-hidden="true"></div>',
      className: "live-marker-wrapper",
      iconSize: [34, 42],
      iconAnchor: [17, 42],
      popupAnchor: [0, -40],
    });
  }

  if (serviceType === "school_partner_location") {
    return L.divIcon({
      html: '<div class="school-map-marker" aria-hidden="true"></div>',
      className: "live-marker-wrapper",
      iconSize: [34, 42],
      iconAnchor: [17, 42],
      popupAnchor: [0, -40],
    });
  }

  return L.divIcon({
    html: `<img src="${SERVICE_ICONS[serviceType]}" alt="" aria-hidden="true" />`,
    className: "live-marker-wrapper",
    iconSize: serviceType === "direct_service" ? [38, 52] : [36, 50],
    iconAnchor: serviceType === "direct_service" ? [19, 52] : [18, 50],
    popupAnchor: [0, -48],
  });
}

function makePopup(record) {
  const details = [
    ["Category", PROGRAM_CATEGORIES[record.program_category]],
    ["Type", SERVICE_TYPES[record.service_type]],
    ["Program", clean(record.program_name)],
    ["Brand", clean(record.brand)],
    ["Organization", clean(record.organization)],
    ["Status", clean(record.status)],
  ].filter(([, value]) => value);

  const location = [clean(record.city), clean(record.state_province), record.country_display]
    .filter(Boolean)
    .join(", ");

  return `
    <div class="popup">
      <h3>${escapeHtml(record.location_name)}</h3>
      <p class="address-line">${escapeHtml(record.address)}${record.address && location ? "<br>" : ""}${escapeHtml(location)}</p>
      <dl>${details
        .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
        .join("")}</dl>
      <div class="record-key">${escapeHtml(record.location_id)}</div>
    </div>
  `;
}

function renderSummary() {
  const visible = filteredRecords.length;
  const total = allRecords.length;
  const categoryCounts = filteredRecords.reduce((counts, record) => {
    counts[record.program_category] = (counts[record.program_category] || 0) + 1;
    return counts;
  }, {});
  const breakdown = Object.entries(PROGRAM_CATEGORIES)
    .filter(([category]) => categoryCounts[category])
    .map(([category, label]) => `${label}: ${categoryCounts[category].toLocaleString()}`)
    .join(" · ");

  const usStates = new Set(
    filteredRecords
      .filter((record) => record.country_display === "United States")
      .map((record) => clean(record.state_province))
      .filter(Boolean)
  );
  const canadianRegions = new Set(
    filteredRecords
      .filter((record) => record.country_display === "Canada")
      .map((record) => clean(record.state_province))
      .filter(Boolean)
  );
  const reach = [
    usStates.size ? `${usStates.size} U.S. state${usStates.size === 1 ? "" : "s"}` : "",
    canadianRegions.size
      ? `${canadianRegions.size} Canadian province${canadianRegions.size === 1 ? "" : "s"}/territor${
          canadianRegions.size === 1 ? "y" : "ies"
        }`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  elements.summaryText.textContent = [
    `${visible.toLocaleString()} of ${total.toLocaleString()} published locations shown`,
    reach,
    breakdown,
  ]
    .filter(Boolean)
    .join(" · ");
}

function setStatus(message, kind = "") {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message${kind ? ` ${kind}` : ""}`;
}

function clean(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function escapeHtml(value) {
  return clean(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
