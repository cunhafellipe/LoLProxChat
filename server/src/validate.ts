// Validation for the `join` handshake. Everything here runs on values that came
// straight out of `JSON.parse`, so nothing may be assumed about their type — a
// truthiness check alone lets `{"room":123,"name":{}}` into room state, where a
// non-string name breaks name-keyed signal routing for the whole room.

export const MAX_NAME_LEN = 64;
export const MAX_ROOM_ID_LEN = 64;

/**
 * Room ids the server will accept. `generateRoomId` (src/core/room.ts) emits
 * base36, and no UI anywhere lets a player type a room id, so this is far wider
 * than any real client needs; it exists to keep control characters and
 * unbounded strings out of log lines and room keys. Deliberately permissive so
 * a self-hoster running a modified client isn't locked out by it.
 */
export const ROOM_ID_RE = /^[A-Za-z0-9._:-]{1,64}$/;

// C0 controls, DEL and C1 controls. A Riot ID cannot contain these, and they
// would corrupt any log line or console output carrying the name.
const CONTROL_CHARS_RE = /[\x00-\x1F\x7F-\x9F]/;

// A camera box can never be bigger than the map (~15000 units on Summoner's
// Rift); anything past this is garbage, not a camera.
export const MAX_CAMERA_SPAN = 20_000;
// Five enemies, so five icons; a few spare for a sighting held across a frame.
export const MAX_VISIBLE_ICONS = 10;
// Champions one red blob can stand for (icons merge when enemies stand
// together); five is the whole enemy team.
export const MAX_ICON_COUNT = 5;

/**
 * The camera box size off a `coords` message (cw, ch), or undefined when it
 * carries none or a malformed one — which leaves the camera scored by its
 * centre, as for an older client.
 */
export function parseCameraSize(cw: unknown, ch: unknown): { w: number; h: number } | undefined {
  const span = (v: unknown): v is number =>
    typeof v === 'number' && isFinite(v) && v > 0 && v <= MAX_CAMERA_SPAN;
  return span(cw) && span(ch) ? { w: cw, h: ch } : undefined;
}

/**
 * The enemy icons a `coords` message says its minimap is drawing (`vis`):
 * [x, y] or [x, y, n] with n the champions the icon holds. Undefined when the
 * message has no list at all — an older client, scored without the fog-of-war
 * check. Malformed entries are dropped one by one, so a client always gets a
 * list (possibly empty) once it sends one.
 */
export function parseVisibleIcons(vis: unknown): { x: number; y: number; n: number }[] | undefined {
  if (!Array.isArray(vis)) return undefined;
  const icons: { x: number; y: number; n: number }[] = [];
  for (const p of vis.slice(0, MAX_VISIBLE_ICONS)) {
    if (!Array.isArray(p) || (p.length !== 2 && p.length !== 3)) continue;
    const [x, y, n = 1] = p;
    if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) continue;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_ICON_COUNT) continue;
    icons.push({ x, y, n });
  }
  return icons;
}

export type JoinValidation =
  | { ok: true; room: string; name: string }
  | { ok: false; error: string };

/**
 * Validate a `join`'s room and name.
 *
 * The name is accepted or rejected verbatim — never trimmed, case-folded or
 * unicode-normalised. The client's identity IS the raw string (`riotId`, see
 * orchestrator.ts): it is what `signal` messages are addressed to and what the
 * `localName < remoteName` initiator election compares. A server that stored a
 * normalised variant would make `findInRoom` miss and break signaling for
 * anyone whose name differs from its normal form — indistinguishable, from the
 * user's side, from the duplicate-name bug this validation ships alongside.
 * Riot IDs are unicode, so there is no charset restriction on names either.
 */
export function validateJoin(room: unknown, name: unknown): JoinValidation {
  if (typeof room !== 'string') return { ok: false, error: 'join requires room as a string' };
  if (typeof name !== 'string') return { ok: false, error: 'join requires name as a string' };

  if (!ROOM_ID_RE.test(room)) {
    return { ok: false, error: `join room must be 1-${MAX_ROOM_ID_LEN} characters of [A-Za-z0-9._:-]` };
  }

  if (name.length === 0) return { ok: false, error: 'join name must not be empty' };
  if (name.length > MAX_NAME_LEN) {
    return { ok: false, error: `join name must be at most ${MAX_NAME_LEN} characters` };
  }
  if (CONTROL_CHARS_RE.test(name)) {
    return { ok: false, error: 'join name must not contain control characters' };
  }

  return { ok: true, room, name };
}
