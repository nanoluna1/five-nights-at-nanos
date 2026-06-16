// Shared, client-local cheat state (cosmetic / convenience). Set from main.js key handlers and read
// by the renderers (spin wheel + world). Not networked — each player toggles their own.
export const cheats = {
  cluckGif: false,  // replace Cluck (wheel + in-game) with the Cluck meme image
  cluckImg: null,   // the loaded Image once armed
};
