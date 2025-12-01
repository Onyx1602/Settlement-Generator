const ST_ID = "settlement-generator";
const ST_FLAGS_ROOT = "settlement-generator";

console.log(`${ST_ID} | initializing`);

const DEFAULT_ALLEGIANCES = [
  "Independent",
  "Kingdom of Aurelia",
  "Free Traders' League",
  "Order of the Beacon",
  "Frontier Protectorate",
  "Shadow Consortium",
  "Ironclad Dominion",
  "Emerald Enclave",
  "Crimson Syndicate",
  "Silvermoon Alliance",
  "Grand Duchy of Valoria",
  "Royal Dominion of Thaloris",
  "People's Coalition",
  "Merchant Republic",
  "Clans of the North"
];

let ST_BUILDINGS = { buildings: [] };

// Hooks and Setup Methods

Hooks.once("init", () => {
  // Register helpers universally
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("includes", (arr, val) => Array.isArray(arr) && arr.includes(val));
});

Hooks.on("settlement-tracking.collectionReady", (coll) => {
  try {
    buildSettlementBuildingsFromCollection(coll || window.ST_COLLECTION || {});
  } catch (err) {
    console.error(`${ST_ID} | Failed to build ST_BUILDINGS from collection`, err);
  }
});

Hooks.once("ready", () => {
  if (window.ST_COLLECTION?.buildings?.length) {
    buildSettlementBuildingsFromCollection(window.ST_COLLECTION);
  }
});

// Header button for JournalEntry sheets
Hooks.on("getJournalSheetHeaderButtons", (sheet, buttons) => {
  if (!game.user?.isGM) return;
  buttons.unshift({
    label: game.i18n.localize("settlement-tracking.headerButton"),
    class: "st-open-form",
    icon: "fas fa-city",
    onclick: () => {
      new SettlementGenerator({ targetJournal: sheet.object ?? null }).render({ force: true });
    }
  });
});

// Sidebar Button
Hooks.on("renderJournalDirectory", (app, html) => {
  addSettlementGeneratorButtonHeader(html);
});
// Sidebar Button Fallback
Hooks.on("renderSidebarTab", (app, html) => {
  if (app?.options?.id === "journal" || app?.tabName === "journal") {
    addSettlementGeneratorButtonHeader(html);
  }
});


// Utility Functions

function buildSettlementBuildingsFromCollection(coll) {
  const rawBuildings = Array.isArray(coll?.buildings) ? coll.buildings : [];

  ST_BUILDINGS = {
    buildings: rawBuildings
      .filter(b => (b.type === "building" || b.data?.ownerTitle || b.data?.economy || b.resources))
      .map((b, idx) => {
        const key = b.key || `building-${idx}`;
        const name = b.name || key;

        if (b.type === "building" && b.data) {
          const data = b.data;
          const econ = data.economy || {};
          const stats = econ.settlementStats || {};
          return {
            key, name,
            owner: data.ownerTitle || data.owner || "",
            description: data.description || "",
            defaultInventory: data.defaultInventory || [],
            resources: {
              consumerGoods: Number(stats.consumerGoods ?? 0),
              wealth: Number(stats.wealth ?? 0),
              luxuries: Number(stats.luxuries ?? 0),
              materials: Number(stats.materials ?? 0),
              food: Number(stats.food ?? 0)
            },
            notableNpcs: (data.npcs?.typicalWorkers || []).concat(data.npcs?.typicalPatrons || []),
            notableOrganizations: econ.imports || []
          };
        }

        const legacyRes = b.resources || {};
        return {
          key, name,
          owner: b.owner || "",
          description: b.description || "",
          defaultInventory: b.defaultInventory || [],
          resources: {
            consumerGoods: Number(legacyRes.consumerGoods || 0),
            wealth: Number(legacyRes.wealth || 0),
            luxuries: Number(legacyRes.luxuries || 0),
            materials: Number(legacyRes.materials || 0),
            food: Number(legacyRes.food || 0)
          },
          notableNpcs: b.notableNpcs || [],
          notableOrganizations: b.notableOrganizations || []
        };
      })
  };
  console.log(`${ST_ID} | ST_BUILDINGS ready.`);
}

function sumResourcesByKeys(keys = []) {
  const map = new Map((ST_BUILDINGS.buildings || []).map(b => [b.key, b]));
  const total = { consumerGoods: 0, wealth: 0, luxuries: 0, materials: 0, food: 0 };
  for (const k of keys) {
    const b = map.get(k);
    if (!b?.resources) continue;
    total.consumerGoods += Number(b.resources.consumerGoods || 0);
    total.wealth += Number(b.resources.wealth || 0);
    total.luxuries += Number(b.resources.luxuries || 0);
    total.materials += Number(b.resources.materials || 0);
    total.food += Number(b.resources.food || 0);
  }
  return total;
}

function formatResourcesHTML(r) {
  return `
  <div class="st-resources-grid">
    <div><strong>${game.i18n.localize("settlement-tracking.fields.resources.consumerGoods")}:</strong> ${r.consumerGoods}</div>
    <div><strong>${game.i18n.localize("settlement-tracking.fields.resources.wealth")}:</strong> ${r.wealth}</div>
    <div><strong>${game.i18n.localize("settlement-tracking.fields.resources.luxuries")}:</strong> ${r.luxuries}</div>
    <div><strong>${game.i18n.localize("settlement-tracking.fields.resources.materials")}:</strong> ${r.materials}</div>
    <div><strong>${game.i18n.localize("settlement-tracking.fields.resources.food")}:</strong> ${r.food}</div>
  </div>`.trim();
}

// Helper to create button in sidebar
function addSettlementGeneratorButtonHeader(html) {
  if (!game.user?.isGM) return;
  const $html = $(html); // Ensure jQuery wrapper
  $html.find(".st-settlement-generator-btn-row").remove();
  
  let header = $html.find(".directory-header");
  if (!header.length) return;
  let actionBtns = header.find(".action-buttons");
  if (!actionBtns.length) actionBtns = header;

  const btnRow = $(`
    <div class="st-settlement-generator-btn-row" style="width:100%;display:flex;justify-content:flex-start;margin-top:8px;">
      <button type="button" class="st-open-settlement-generator" style="display:flex;align-items:center;gap:8px;flex:1;padding:6px 0;font-size:0.9em;white-space:nowrap;">
        <i class="fas fa-city"></i>
        ${game.i18n.localize("settlement-tracking.headerButton")}
      </button>
    </div>
  `);

  btnRow.find("button.st-open-settlement-generator").on("click", () => {
    new SettlementGenerator({ targetJournal: null }).render({ force: true });
  });
  actionBtns.after(btnRow);
}

// Randomizers
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomName() {
  const starts = ["A", "Be", "Ca", "Da", "El", "Fa", "Gra", "Har", "Il", "Ka", "Lo", "Mor", "Nor", "Or", "Pra", "Qua", "Riv", "Sa", "Tor", "Um", "Va", "Wes", "Yor", "Zan"];
  const ends = ["dale", "ford", "stead", "burg", "port", "holm", "shire", "bridge", "haven", "gate", "watch", "cross", "field", "peak"];
  return `${pickRandom(starts)}${pickRandom(ends)}`;
}
function randomPopulation() { return Math.floor(50 + Math.random() * 4950); }
function randomBuildings(count = 3) {
  const keys = (ST_BUILDINGS.buildings || []).map(b => b.key);
  const out = new Set();
  const target = Math.min(count, keys.length);
  while (out.size < target) out.add(pickRandom(keys));
  return Array.from(out);
}


// ApplicationV2 Implementation

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class SettlementGenerator extends HandlebarsApplicationMixin(ApplicationV2) {
  
  constructor(options = {}) {
    super(options);
    this.targetJournal = options.targetJournal ?? null;
  }

  static DEFAULT_OPTIONS = {
    tag: "div", 
    id: "settlement-generator",
    classes: ["settlement-generator"],
    window: {
      title: "settlement-tracking.title",
      resizable: true,
      icon: "fas fa-city"
    },
    position: {
      width: 680,
      height: "auto"
    },
    actions: {
      generate: SettlementGenerator.prototype._onGenerate,
      randomize: SettlementGenerator.prototype._onRandomize,
      toggleLock: SettlementGenerator.prototype._onToggleLock
    }
  };

  static PARTS = {
    form: {
      template: "modules/settlement-generator/templates/settlement-form.html"
    }
  };

  // Data Preparation

  async _prepareContext(options) {
    const initial = this._extractInitial(this.targetJournal);
    const buildingTemplates = ST_BUILDINGS.buildings || [];
    const allSettlements = Array.from(game.journal ?? []).filter(j => j.getFlag(ST_FLAGS_ROOT, "isSettlement"));
    
    const parentOptions = allSettlements
      .filter(j => !this.targetJournal || j.id !== this.targetJournal.id)
      .map(j => ({ id: j.id, name: j.name }));

    let childSettlements = [];
    if (this.targetJournal) {
      childSettlements = allSettlements.filter(j => (j.getFlag(ST_FLAGS_ROOT, "settlementData")?.parentId) === this.targetJournal.id);
    }

    // Calculate initial resources
    const res = sumResourcesByKeys(initial.buildingKeys);

    return {
      initial,
      buildingTemplates,
      parentOptions,
      childSettlements,
      resources: res
    };
  }

  _extractInitial(journal) {
    if (!journal) {
      return {
        name: "", allegiance: "", population: "", nNpcs: "", nOrgs: "",
        buildingKeys: [], parentId: "", description: ""
      };
    }
    const f = journal.getFlag(ST_FLAGS_ROOT, "settlementData") || {};
    return {
      name: journal.name ?? "",
      allegiance: f.allegiance ?? "",
      population: f.population ?? "",
      nNpcs: (f.notableNpcs || []).join("\n"),
      nOrgs: (f.notableOrganizations || []).join("\n"),
      buildingKeys: f.buildingKeys ?? [],
      parentId: f.parentId ?? "",
      description: f.description ?? ""
    };
  }

  // Rendering & Listeners

  _onRender(context, options) {
    // Call super if necessary, though HandlebarsMixin handles mostly everything.
    super._onRender(context, options);

    const html = $(this.element);

    // Initialize Resource Summary Display
    const initRes = sumResourcesByKeys(context.initial.buildingKeys);
    const resEl = html.find("#stResourcesSummary");
    if (resEl.length) resEl.html(formatResourcesHTML(initRes));

    // Setup Building Change Listener 
    html.find("#stBuildings").on("change", () => {
      const keys = html.find("#stBuildings").val() || [];
      const r = sumResourcesByKeys(keys);
      html.find("#stResourcesSummary").html(formatResourcesHTML(r));
    });

    // Building Search Listener
    html.find("#stBuildingSearch").on("input", (ev) => {
      const val = ev.target.value.toLowerCase();
      html.find("#stBuildings option").each((i, el) => {
        const text = el.innerText.toLowerCase();
        // Toggle visibility based on search term
        el.style.display = text.includes(val) ? "" : "none";
      });
    });

    // Restore Locked States visually (if we re-rendered)
    html.find(".settle-lock-icon").each((_, icon) => {
      const fieldId = icon.dataset.target;
      const field = html.find(`#${fieldId}`)[0];
      if(field && field.dataset.locked === "true") {
         // If we had persistent state, we would apply it here
      } else if (field) {
         field.dataset.locked = "false";
      }
    });
  }

  // Actions

  _onToggleLock(event, target) {
    event.preventDefault();
    const icon = target; // The element with data-action
    const fieldId = icon.dataset.target;
    const html = $(this.element);
    const field = html.find(`#${fieldId}`)[0];
    
    if (!field) return;

    const isLocked = field.dataset.locked === "true";
    const newState = !isLocked;
    
    field.dataset.locked = newState.toString();
    field.disabled = newState;

    // Update Icon UI
    icon.classList.toggle("locked", newState);
    icon.classList.toggle("unlocked", !newState);
    icon.innerHTML = newState ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-lock-open"></i>';
    
    // Update Label UI
    const label = html.find(`label[for="${fieldId}"]`);
    if (label.length) label.toggleClass("settle-locked-label", newState);
  }

  _onRandomize(event, target) {
    const html = $(this.element);
    
    const updateIfUnlocked = (id, val) => {
      const el = html.find(`#${id}`)[0];
      if (el && el.dataset.locked !== "true") el.value = val;
    };

    updateIfUnlocked("stName", randomName());
    updateIfUnlocked("stAllegiance", pickRandom(DEFAULT_ALLEGIANCES));
    updateIfUnlocked("stPopulation", randomPopulation());
    updateIfUnlocked("stNpcs", "Mayor Arlen\nCaptain Brynn");
    updateIfUnlocked("stOrgs", "Merchants' Guild\nMasons' Lodge");
    updateIfUnlocked("stDescription", "A modest settlement with bustling markets and a proud watch.");

    const bEl = html.find("#stBuildings")[0];
    if (bEl && bEl.dataset.locked !== "true") {
      const keys = randomBuildings(3 + Math.floor(Math.random() * 3));
      // Select options in multi-select
      Array.from(bEl.options).forEach(opt => opt.selected = keys.includes(opt.value));
      // Trigger update manually to refresh resource UI
      html.find("#stBuildings").trigger("change");
    }
  }

  async _onGenerate(event, target) {
    // Prevent double submission
    if (this._submitting) return;
    this._submitting = true;

    try {
      const html = this.element; 
      const form = html.querySelector("form.settlement-form");
      const fd = new FormData(form);

      // Helper to get locked values vs form values
      const getVal = (id, name) => {
        const el = html.querySelector(`#${id}`);
        // If locked, use current value. If unlocked, FormData value is safer for some input types.
        return el.value; 
      };

      const name = getVal("stName").trim() || "Unnamed Settlement";
      const allegiance = getVal("stAllegiance").trim();
      const population = Number(getVal("stPopulation") || 0);
      const parentId = getVal("stParent"); // Select
      const nNpcs = getVal("stNpcs").split("\n").map(s => s.trim()).filter(Boolean);
      const nOrgs = getVal("stOrgs").split("\n").map(s => s.trim()).filter(Boolean);
      const description = getVal("stDescription");

      // Handle Multiple Select for Buildings
      const buildingSelect = html.querySelector("#stBuildings");
      const buildingKeys = Array.from(buildingSelect.selectedOptions).map(opt => opt.value);

      const resources = sumResourcesByKeys(buildingKeys);

      //Random Selection Logic
      const pickRandomCount = (arr, min, max) => {
        if (!arr || !arr.length) return [];
        const count = Math.floor(Math.random() * (max - min + 1)) + min;
        return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
      };

      const randomEvents = pickRandomCount(window.ST_COLLECTION?.events || [], 1, 3);
      const randomDowntimes = pickRandomCount(window.ST_COLLECTION?.downtimes || [], 1, 5);
      const randomDistricts = pickRandomCount(window.ST_COLLECTION?.districts || [], 1, 5);

      // Ensure Root Folder "Settlements"
      const rootFolderName = "Settlements";
      let rootFolder = game.folders.find(f => f.type === "JournalEntry" && f.name === rootFolderName && !f.folder);
      if (!rootFolder) rootFolder = await Folder.create({ name: rootFolderName, type: "JournalEntry" });

      // Ensure specific Settlement Folder inside Root
      const settlementFolderName = `${name} Settlement`;
      let folder = game.folders.find(f => f.type === "JournalEntry" && f.name === settlementFolderName && f.folder?.id === rootFolder.id);
      if (!folder) folder = await Folder.create({ name: settlementFolderName, type: "JournalEntry", folder: rootFolder.id });

      // Prepare Content
      const contentHTML = `
        <h1>${foundry.utils.escapeHTML(name)}</h1>
        <p><strong>${game.i18n.localize("settlement-tracking.fields.allegiance")}:</strong> ${foundry.utils.escapeHTML(allegiance)}</p>
        <p><strong>${game.i18n.localize("settlement-tracking.fields.population")}:</strong> ${population}</p>
        <h3>${game.i18n.localize("settlement-tracking.fields.resources.title")}</h3>
        ${formatResourcesHTML(resources)}
        <h3>${game.i18n.localize("settlement-tracking.fields.notableNpcs")}</h3>
        <ul>${nNpcs.map(s => `<li>${foundry.utils.escapeHTML(s)}</li>`).join("") || "<li>-</li>"}</ul>
        <h3>${game.i18n.localize("settlement-tracking.fields.notableOrgs")}</h3>
        <ul>${nOrgs.map(s => `<li>${foundry.utils.escapeHTML(s)}</li>`).join("") || "<li>-</li>"}</ul>
        <h3>${game.i18n.localize("settlement-tracking.fields.buildings")}</h3>
        <ul>${buildingKeys.map(k => {
          const b = (ST_BUILDINGS.buildings || []).find(x => x.key === k);
          return `<li>${foundry.utils.escapeHTML(b?.name ?? k)}</li>`;
        }).join("") || "<li>-</li>"}</ul>
        
        <h3>Districts</h3>
        <ul>${randomDistricts.map(d => `<li>${foundry.utils.escapeHTML(d.name)}</li>`).join("") || "<li>-</li>"}</ul>
        
        <h3>Events</h3>
        <ul>${randomEvents.map(e => `<li>${foundry.utils.escapeHTML(e.name)}</li>`).join("") || "<li>-</li>"}</ul>
        
        <h3>Downtime Activities</h3>
        <ul>${randomDowntimes.map(d => `<li>${foundry.utils.escapeHTML(d.name)}</li>`).join("") || "<li>-</li>"}</ul>

        <h3>${game.i18n.localize("settlement-tracking.fields.description")}</h3>
        <p>${foundry.utils.escapeHTML(description)}</p>
      `.trim();

      const baseFlags = {
        [ST_FLAGS_ROOT]: {
          isSettlement: true,
          settlementData: {
            allegiance, population, parentId, description,
            notableNpcs: nNpcs, notableOrganizations: nOrgs,
            buildingKeys,
            // Save generated keys
            districtKeys: randomDistricts.map(d => d.key),
            eventKeys: randomEvents.map(e => e.key),
            downtimeKeys: randomDowntimes.map(d => d.key)
          }
        }
      };

      // Create or Update Journal Entry
      let settlementJE = this.targetJournal;
      if (settlementJE) {
        await settlementJE.update({ name, flags: baseFlags, folder: folder.id });
      } else {
        settlementJE = await JournalEntry.create({ name, flags: baseFlags, folder: folder.id });
      }

      // Upsert Pages & Scene Notes
      await this._upsertTextPage(settlementJE, { role: "settlement", name: "Overview", contentHTML });
      await this._ensureSceneNoteForJournal(settlementJE, { label: name });

      // Handle Buildings (Sub-journals)
      // Create "Buildings" folder inside the settlement folder
      const subFolderName = "Buildings";
      let bFolder = game.folders.find(f => f.type === "JournalEntry" && f.name === subFolderName && f.folder?.id === folder.id);
      if (!bFolder) bFolder = await Folder.create({ name: subFolderName, type: "JournalEntry", folder: folder.id });

      const templatesByKey = new Map((ST_BUILDINGS.buildings || []).map(b => [b.key, b]));
      const buildingIds = [];
      
      for (const k of buildingKeys) {
        const tpl = templatesByKey.get(k);
        if (!tpl) continue;
        const bName = tpl.name;
        const bContent = `
          <h1>${foundry.utils.escapeHTML(bName)}</h1>
          <p><strong>${game.i18n.localize("settlement-tracking.building.owner")}:</strong> ${foundry.utils.escapeHTML(tpl.owner || "")}</p>
          <h3>${game.i18n.localize("settlement-tracking.building.description")}</h3>
          <p>${foundry.utils.escapeHTML(tpl.description || "")}</p>
          <h3>${game.i18n.localize("settlement-tracking.building.defaultInventory")}</h3>
          <ul>${(tpl.defaultInventory || []).map(i => `<li>${foundry.utils.escapeHTML(i)}</li>`).join("") || "<li>-</li>"}</ul>
          <h3>${game.i18n.localize("settlement-tracking.fields.resources.title")}</h3>
          ${formatResourcesHTML(tpl.resources || {consumerGoods:0,wealth:0,luxuries:0,materials:0,food:0})}
        `.trim();

        const bFlags = {
          [ST_FLAGS_ROOT]: {
            isBuilding: true,
            parentSettlementId: settlementJE.id,
            buildingTemplateKey: k
          }
        };

        const je = await JournalEntry.create({ name: `${name}: ${bName}`, flags: bFlags, folder: bFolder.id });
        await this._upsertTextPage(je, { role: "building", name: "Overview", contentHTML: bContent });
        buildingIds.push(je.id);
      }

      // Generate Sub-Journals for Districts, Events, Downtimes
      const createExtras = async (items, label, type, htmlGen) => {
        if (!items.length) return [];
        // Create sub-folder inside the settlement folder
        const sName = label;
        let sFolder = game.folders.find(f => f.type === "JournalEntry" && f.name === sName && f.folder?.id === folder.id);
        if (!sFolder) sFolder = await Folder.create({ name: sName, type: "JournalEntry", folder: folder.id });
        
        const ids = [];
        for (const item of items) {
          const content = htmlGen(item);
          const flags = { [ST_FLAGS_ROOT]: { isExtra: true, type, parentSettlementId: settlementJE.id, key: item.key } };
          const je = await JournalEntry.create({ name: `${name}: ${item.name}`, flags, folder: sFolder.id });
          await this._upsertTextPage(je, { role: type, name: "Overview", contentHTML: content });
          ids.push(je.id);
        }
        return ids;
      };

      await createExtras(randomDistricts, "Districts", "district", (d) => `
        <h1>${foundry.utils.escapeHTML(d.name)}</h1>
        <p><strong>Type:</strong> ${foundry.utils.escapeHTML(d.data?.type || "District")}</p>
        <p>${foundry.utils.escapeHTML(d.data?.description || "")}</p>
        <h3>Stats</h3>
        ${formatResourcesHTML(d.data?.districtStats || {})}
      `);

      await createExtras(randomEvents, "Events", "event", (e) => `
        <h1>${foundry.utils.escapeHTML(e.name)}</h1>
        <p><strong>Season:</strong> ${foundry.utils.escapeHTML(e.data?.season || "")}</p>
        <p>${foundry.utils.escapeHTML(e.data?.description || "")}</p>
      `);

      await createExtras(randomDowntimes, "Downtimes", "downtime", (d) => `
        <h1>${foundry.utils.escapeHTML(d.name)}</h1>
        <p>${foundry.utils.escapeHTML(d.data?.description || "")}</p>
        <p><strong>Cost:</strong> ${d.data?.cost?.time?.days || 0} Days</p>
      `);

      // Update parent with building IDs
      await settlementJE.update({
        flags: {
          [ST_FLAGS_ROOT]: {
            ...baseFlags[ST_FLAGS_ROOT],
            buildingJournalIds: buildingIds
          }
        }
      });

      ui.notifications.info(game.i18n.localize("settlement-tracking.builtNotice"));
      this.close();

    } catch (err) {
      console.error("Settlement generation failed:", err);
      ui.notifications.error("Settlement generation failed. See console for details.");
    } finally {
      this._submitting = false;
    }
  }

  // Helper Functions
  async _upsertTextPage(journal, { role, name = "Overview", contentHTML }) {
    try {
      const pages = journal.pages?.contents ?? [];
      const existing = pages.find(p => p.getFlag(ST_FLAGS_ROOT, "role") === role) || pages.find(p => p.name === name && p.type === "text");

      if (existing) {
        await journal.updateEmbeddedDocuments("JournalEntryPage", [{
          _id: existing.id,
          name,
          text: { content: contentHTML },
          flags: { [ST_FLAGS_ROOT]: { role } }
        }]);
      } else {
        await journal.createEmbeddedDocuments("JournalEntryPage", [{
          name,
          type: "text",
          text: { content: contentHTML },
          flags: { [ST_FLAGS_ROOT]: { role } }
        }]);
      }
    } catch (e) {
      console.warn(`${ST_ID} | Failed to upsert page for ${journal?.name}`, e);
    }
  }

  async _ensureSceneNoteForJournal(journal, { label }) {
    try {
      const scene = canvas?.scene;
      if (!scene) return;
      const hasNote = scene.notes?.find(n => n.entryId === journal.id);
      if (hasNote) return;

      const x = Math.max(100, Math.floor((scene.width || 0) / 2) || 100);
      const y = Math.max(100, Math.floor((scene.height || 0) / 2) || 100);

      await scene.createEmbeddedDocuments("Note", [{
        x, y,
        entryId: journal.id,
        text: label || journal.name,
        icon: "icons/svg/book.svg"
      }]);
    } catch (e) {
      console.warn(`${ST_ID} | Failed to create scene note for ${journal?.name}`, e);
    }
  }
}

// Expose globally
window.SettlementGenerator = SettlementGenerator;