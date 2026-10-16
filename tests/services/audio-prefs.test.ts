import {
  getAllyProximity, setAllyProximity, getCameraListen, setCameraListen, getSharedReset, setSharedReset,
  getCameraOnly, setCameraOnly, getAppAudio, setAppAudio, applyAudioDefaultsOnce,
} from '../../src/services/audio-prefs';
import { getForceTurnRelay, setForceTurnRelay } from '../../src/services/privacy';

// The node test environment has no localStorage; a plain map is all the
// module touches.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
};

describe('audio prefs', () => {
  beforeEach(() => store.clear());

  test('a fresh install: the audio toggles and hide IP on, the two opt-ins off', () => {
    expect(getAllyProximity()).toBe(true);
    expect(getCameraListen()).toBe(true);
    expect(getCameraOnly()).toBe(true);
    expect(getForceTurnRelay()).toBe(true);
    // Shared RESET makes other players' apps act on a message, and app audio
    // brings echo back on speakers: each is something a player turns on.
    expect(getSharedReset()).toBe(false);
    expect(getAppAudio()).toBe(false);
  });

  test('turning one off survives a restart, and does not touch the other', () => {
    setAllyProximity(false);
    expect(store.get('lolproxchat.allyProximity')).toBe('0');
    expect(getAllyProximity()).toBe(false);
    expect(getCameraListen()).toBe(true);

    setCameraListen(false);
    expect(getCameraListen()).toBe(false);
    setCameraListen(true);
    expect(getCameraListen()).toBe(true);
    expect(getAllyProximity()).toBe(false);
  });

  test('the first launch of this build puts both toggles back on, once, and nothing else', () => {
    setAllyProximity(false);
    setCameraListen(false);
    setCameraOnly(false);
    setSharedReset(true);
    setForceTurnRelay(false);
    expect(applyAudioDefaultsOnce()).toBe(true);
    expect(getAllyProximity()).toBe(true);
    expect(getCameraListen()).toBe(true);
    // A choice the user made is not a default to restore.
    expect(getCameraOnly()).toBe(false);
    expect(getSharedReset()).toBe(true);
    expect(getAppAudio()).toBe(false);
    expect(getForceTurnRelay()).toBe(false);

    // Turned off again afterwards, it stays off across later launches.
    setAllyProximity(false);
    expect(applyAudioDefaultsOnce()).toBe(false);
    expect(getAllyProximity()).toBe(false);
  });

  test('the one-time defaults never throw when storage does', () => {
    const real = (globalThis as any).localStorage;
    (globalThis as any).localStorage = { getItem: () => { throw new Error('denied'); } };
    try {
      expect(applyAudioDefaultsOnce()).toBe(false);
    } finally {
      (globalThis as any).localStorage = real;
    }
  });

  test('an install that had turned a toggle on before v0.5.18 keeps it on', () => {
    store.set('lolproxchat.allyProximity', '1');
    store.set('lolproxchat.cameraListen', '1');
    expect(getAllyProximity()).toBe(true);
    expect(getCameraListen()).toBe(true);
  });

  test('shared RESET and app audio are off until turned on, and anything but "on" reads as off', () => {
    for (const [get, set, key] of [
      [getSharedReset, setSharedReset, 'lolproxchat.sharedReset'],
      [getAppAudio, setAppAudio, 'lolproxchat.appAudio'],
    ] as const) {
      expect(get()).toBe(false);
      store.set(key, 'true');
      expect(get()).toBe(false);
      set(true);
      expect(store.get(key)).toBe('1');
      expect(get()).toBe(true);
      set(false);
      expect(get()).toBe(false);
    }
  });

  test('hide IP stays off once turned off', () => {
    setForceTurnRelay(false);
    expect(store.get('lolproxchat.forceTurnRelay')).toBe('0');
    expect(getForceTurnRelay()).toBe(false);
    setForceTurnRelay(true);
    expect(getForceTurnRelay()).toBe(true);
  });

  test('unreadable storage: the opt-ins read as off, camera mode and hide IP as on', () => {
    const real = (globalThis as any).localStorage;
    (globalThis as any).localStorage = { getItem: () => { throw new Error('blocked'); } };
    try {
      expect(getSharedReset()).toBe(false);
      expect(getAppAudio()).toBe(false);
      expect(getCameraOnly()).toBe(true);
      expect(getForceTurnRelay()).toBe(true);
    } finally {
      (globalThis as any).localStorage = real;
    }
  });
});
