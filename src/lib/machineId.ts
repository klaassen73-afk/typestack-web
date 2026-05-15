// Stable per-browser machine id used for refresh-token binding.
// Generated on first run and persisted in localStorage.

const KEY = 'typestack.machineId';

export function getMachineId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `web-${crypto.randomUUID()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
