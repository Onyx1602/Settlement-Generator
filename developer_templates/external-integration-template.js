/**
 * TEMPLATE: External Module Integration for Settlement Generator
 * 
 * This script allows other modules to register specific data folders containing JSON files
 * for buildings, districts, events, etc.
 * 
 * INSTRUCTIONS:
 * 1. Create folders in your module for your content (e.g., "data/my-buildings", "data/my-events").
 * 2. Place your JSON files in the corresponding folders.
 * 3. Copy this script into your module and add it to your module.json "scripts".
 * 4. Update the paths below to point to your folders.
 */

Hooks.on("settlement-tracking.registerDataPaths", (paths) => {
  const MY_MODULE_ID = "my-module-id"; // TODO: Replace with your module ID
  console.log(`${MY_MODULE_ID} | Registering settlement data paths...`);

  // Add paths to the specific categories you want to extend.
  // You don't need to add paths for categories you aren't using.
  
  // Example: Adding buildings
  // paths.buildings.push(`modules/${MY_MODULE_ID}/data/buildings`);

  // Example: Adding events
  // paths.events.push(`modules/${MY_MODULE_ID}/data/events`);

  // Example: Adding districts
  // paths.districts.push(`modules/${MY_MODULE_ID}/data/districts`);
  
  // Example: Adding downtimes
  // paths.downtimes.push(`modules/${MY_MODULE_ID}/data/downtimes`);
});
