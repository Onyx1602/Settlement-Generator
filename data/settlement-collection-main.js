const STC_ID = "settlement-generator";

async function stcLoadJsonFolder(basePath) {
  try {
    // Fix for V13 deprecation: Use namespaced FilePicker if available
    const FilePickerClass = foundry.applications?.apps?.FilePicker ?? FilePicker;
    const browseResult = await FilePickerClass.browse("data", basePath);
    const jsonFiles = (browseResult.files || []).filter(f => f.toLowerCase().endsWith(".json"));
    const loaded = [];

    for (const filePath of jsonFiles) {
      try {
        // Read the file as text via the server; this respects packages & permissions
        const response = await fetch(filePath);
        if (!response.ok) {
          console.warn(`${STC_ID} | Failed to fetch ${filePath}:`, response.status, response.statusText);
          continue;
        }
        const text = await response.text();
        const obj = JSON.parse(text);
        loaded.push(obj);
      } catch (e) {
        console.error(`${STC_ID} | Error loading JSON file ${filePath}`, e);
      }
    }

    return loaded;
  } catch (e) {
    // Suppress errors for missing optional directories
    if (e.message?.includes("does not exist") || e.message?.includes("ENOENT")) {
      // Silent return for optional folders
      return [];
    }
    console.error(`${STC_ID} | Error browsing path ${basePath}`, e);
    return [];
  }
}

Hooks.once("ready", async () => {
  console.log(`${STC_ID} | Collecting settlement data JSONs...`);

  // Define data sources by category. Start with this module's default paths.
  const dataPaths = {
    buildings: ["modules/settlement-generator/data/buildings"],
    settlements: ["modules/settlement-generator/data/settlements"],
    events: ["modules/settlement-generator/data/events"],
    downtimes: ["modules/settlement-generator/data/downtimes"],
    caravans: ["modules/settlement-generator/data/caravans"],
    districts: ["modules/settlement-generator/data/districts"]
  };

  // Allow external modules to register their own data folders for specific categories.
  // Example: paths.buildings.push("modules/my-module/data/my-buildings");
  Hooks.callAll("settlement-tracking.registerDataPaths", dataPaths);

  // Helper to load all paths for a specific category
  const loadCategory = async (paths) => {
    if (!paths || !paths.length) return [];
    const results = await Promise.all(paths.map(path => stcLoadJsonFolder(path)));
    return results.flat();
  };

  // Load all categories
  const [buildings, settlements, events, downtimes, caravans, districts] = await Promise.all([
    loadCategory(dataPaths.buildings),
    loadCategory(dataPaths.settlements),
    loadCategory(dataPaths.events),
    loadCategory(dataPaths.downtimes),
    loadCategory(dataPaths.caravans),
    loadCategory(dataPaths.districts)
  ]);

  // Minimal normalization: ensure each entry has a key and name.
  const normBuildings = buildings.map((b, idx) => {
    const key = b.key || b._id || b.name || `building-${idx}`;
    return {
      key,
      name: b.name || key,
      type: b.type || "building",
      data: b.data || {},
      tags: b.tags || []
    };
  });

  const normSettlements = settlements.map((s, idx) => ({
    key: s.key || s._id || s.name || `settlement-${idx}`,
    ...s
  }));

  const normEvents = events.map((e, idx) => ({
    key: e.key || e._id || e.name || `event-${idx}`,
    ...e
  }));

  const normDowntimes = downtimes.map((d, idx) => ({
    key: d.key || d._id || d.name || `downtime-${idx}`,
    ...d
  }));

  const normCaravans = caravans.map((c, idx) => ({
    key: c.key || c._id || c.name || `caravan-${idx}`,
    ...c
  }));

  const normDistricts = districts.map((d, idx) => ({
    key: d.key || d._id || d.name || `district-${idx}`,
    ...d
  }));

  // Expose everything globally for easy access
  window.ST_COLLECTION = {
    buildings: normBuildings,
    settlements: normSettlements,
    events: normEvents,
    downtimes: normDowntimes,
    caravans: normCaravans,
    districts: normDistricts
  };

  console.log(`${STC_ID} | Loaded:`, {
    buildings: normBuildings.length,
    settlements: normSettlements.length,
    events: normEvents.length,
    downtimes: normDowntimes.length,
    caravans: normCaravans.length,
    districts: normDistricts.length
  });

  // Allow external modules to register content before the application consumes it
  Hooks.callAll("settlement-tracking.registerContent", window.ST_COLLECTION);

  Hooks.callAll("settlement-tracking.collectionReady", window.ST_COLLECTION);

});
