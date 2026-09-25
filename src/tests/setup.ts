import { vi } from 'vitest'

const fakeStorage: Record<string, unknown> = {}

const fakePort = {
  name: 'mock-port',
  onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
  onDisconnect: { addListener: vi.fn(), removeListener: vi.fn() },
  postMessage: vi.fn(),
  disconnect: vi.fn(),
}

const fakeBrowser = {
  storage: {
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    local: {
      get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
        if (!keys)
          return { ...fakeStorage }
        const keyList = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(keys)
        const result: Record<string, unknown> = {}
        for (const k of keyList) {
          if (k in fakeStorage)
            result[k] = fakeStorage[k]
        }
        return result
      }),
      set: vi.fn(async (data: Record<string, unknown>) => {
        Object.assign(fakeStorage, data)
      }),
      clear: vi.fn(async () => {
        for (const k of Object.keys(fakeStorage))
          delete fakeStorage[k]
      }),
    },
  },
  runtime: {
    id: 'test-extension-id',
    openOptionsPage: vi.fn(),
    connect: vi.fn(() => fakePort),
    onConnect: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
  },
  tabs: {
    query: vi.fn(async () => []),
    remove: vi.fn(async () => {}),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
  notifications: {
    create: vi.fn(),
  },
}

vi.stubGlobal('chrome', fakeBrowser)
vi.stubGlobal('browser', fakeBrowser)
