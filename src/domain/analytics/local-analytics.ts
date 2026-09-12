export type LocalEvent = 'gallery_opened' | 'example_used' | 'export_completed';

const key = 'yeyou-local-metrics-v1';

export function trackLocalEvent(event: LocalEvent): void {
  try {
    const current = JSON.parse(window.localStorage.getItem(key) ?? '{}') as Record<string, number>;
    current[event] = (current[event] ?? 0) + 1;
    window.localStorage.setItem(key, JSON.stringify(current));
  } catch {
    // Metrics are strictly optional and never leave the device.
  }
}
