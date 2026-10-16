// Panel toggles: the "ally proximity", "voice on camera" and "camera mode"
// audio settings, then the two opt-ins, shared RESET and app audio (bottom of
// the file). The audio toggles default ON (the first two since v0.5.18), so
// each is stored explicitly as '1' or '0' and a missing key reads as the
// default; the opt-ins read on only from a stored '1'. Before v0.5.18 they defaulted off and "off" was stored
// by removing the key, so an install that had turned one off reads as on after
// the update; there is no way to tell the two apart.

const ALLY_PROXIMITY_KEY = 'lolproxchat.allyProximity';
const CAMERA_LISTEN_KEY = 'lolproxchat.cameraListen';

function readToggle(key: string): boolean {
  return localStorage.getItem(key) !== '0';
}

function writeToggle(key: string, enabled: boolean): void {
  localStorage.setItem(key, enabled ? '1' : '0');
}

// Ally proximity (#22): teammates fade with distance (the same vision-range
// falloff as enemies) instead of always playing at full volume. Default on, so
// out of the box the whole lobby is positional; turning it off trades that for
// hearing your whole team everywhere.
export function getAllyProximity(): boolean {
  return readToggle(ALLY_PROXIMITY_KEY);
}

export function setAllyProximity(enabled: boolean): void {
  writeToggle(ALLY_PROXIMITY_KEY, enabled);
}

// Put both toggles back to their defaults (on) once, on the first launch of a
// build that carries this. A 2026-10-08 test had a player hear their ally at
// full volume across the map for a whole game — what Ally proximity off does —
// so every tester starts the next version from the same, known settings rather
// than whatever an earlier version, or an earlier stray click, left stored.
// Anyone who wants one off turns it off again, and it then stays off: this runs
// once per install, not per launch. Shared RESET is left alone — it is an
// opt-in, so its default is off, and a reset could only ever take it away.
// Nor is anything added since: Camera mode reads as on until it is turned off
// (a missing key is on), and App audio is off until it is turned on.
const AUDIO_DEFAULTS_KEY = 'lolproxchat.audioDefaultsApplied';
const AUDIO_DEFAULTS_VERSION = '1';

/** Returns whether it changed anything this time. Never throws. */
export function applyAudioDefaultsOnce(): boolean {
  try {
    if (localStorage.getItem(AUDIO_DEFAULTS_KEY) === AUDIO_DEFAULTS_VERSION) return false;
    writeToggle(ALLY_PROXIMITY_KEY, true);
    writeToggle(CAMERA_LISTEN_KEY, true);
    localStorage.setItem(AUDIO_DEFAULTS_KEY, AUDIO_DEFAULTS_VERSION);
    return true;
  } catch {
    return false;
  }
}

// "Voice on camera" (#36): hear the map from wherever the camera is looking as
// well as from the champion's own position.
//
// One-way and mutual, both deliberately. One-way because the camera is a point
// you listen from, never one you are heard at: pan onto a fight and you hear
// it, while the people in it hear you only from where your champion stands.
// Mutual because a camera only counts between two players who have both
// turned this on: with it off you publish no camera, nobody else's can reach
// you, and you are heard only by players actually near you on the map.
//
// Default on since v0.5.18, the maintainer's call. It widens what the app can
// tell you about enemies beyond your champion's own vision, which is the
// boundary docs/compliance.md draws; the mutual rule above is what still lets
// one player opt out unilaterally.
export function getCameraListen(): boolean {
  return readToggle(CAMERA_LISTEN_KEY);
}

export function setCameraListen(enabled: boolean): void {
  writeToggle(CAMERA_LISTEN_KEY, enabled);
}

// Camera mode (camera-hearing.ts): hear exactly the players whose icons are
// inside your camera rectangle, and nobody else; be heard by whoever has your
// icon inside theirs. It replaces proximity and voice on camera while on, and
// needs no position of your own, so it does not depend on the tracker finding
// your icon. Default on in this build, which exists for it; stored like the
// toggles above, a missing key reads as on.
const CAMERA_ONLY_KEY = 'lolproxchat.cameraOnly';

export function getCameraOnly(): boolean {
  try {
    return readToggle(CAMERA_ONLY_KEY);
  } catch {
    return true;
  }
}

export function setCameraOnly(enabled: boolean): void {
  writeToggle(CAMERA_ONLY_KEY, enabled);
}

// Shared RESET: pressing RESET also asks everyone else in the game to re-find
// their own icon, and their RESETs re-find ours — but only between players who
// have all turned this on. Off by default and stored as '1' only, unlike the
// toggles above: a missing or unreadable key is off. It makes other players'
// apps act on a message, so it is something each player opts in to — see
// docs/threat-model.md, "Shared RESET".
//
// With it off the client tells the server so on join, the server sends it no
// shared RESET at all, and a 'reset' that arrives anyway (an older or
// misbehaving server) is dropped here — see Orchestrator.handleRemoteReset.
const SHARED_RESET_KEY = 'lolproxchat.sharedReset';

export function getSharedReset(): boolean {
  try {
    return localStorage.getItem(SHARED_RESET_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSharedReset(enabled: boolean): void {
  writeToggle(SHARED_RESET_KEY, enabled);
}

// App audio (app-audio-output.ts): voices played by lolproxchat.exe itself, so OBS's
// Application Audio Capture can take them on their own track. Off by default
// and stored as '1' only (a missing or unreadable key is off): with speakers it
// brings echo back, since the browser's echo canceller no longer hears what is
// played, so it is for streamers on headphones who turn it on. Its device is
// the Rust side's own list (a device name, not a browser device id); missing
// means the Windows default.
const APP_AUDIO_KEY = 'lolproxchat.appAudio';
const APP_AUDIO_DEVICE_KEY = 'lolproxchat.appAudioDevice';

export function getAppAudio(): boolean {
  try {
    return localStorage.getItem(APP_AUDIO_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAppAudio(enabled: boolean): void {
  writeToggle(APP_AUDIO_KEY, enabled);
}

export function getAppAudioDevice(): string | null {
  try {
    return localStorage.getItem(APP_AUDIO_DEVICE_KEY) || null;
  } catch {
    return null;
  }
}

export function setAppAudioDevice(name: string | null): void {
  try {
    if (name) localStorage.setItem(APP_AUDIO_DEVICE_KEY, name);
    else localStorage.removeItem(APP_AUDIO_DEVICE_KEY);
  } catch { /* not stored: the default device is used */ }
}
