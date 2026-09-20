export const ALL_CHANNELS = "__all__";

export const NOTE_STATUSES = [
  { value: "progress", label: "В работе" },
  { value: "done", label: "Сделано" },
  { value: "not_done", label: "Не сделано" },
];

export function noteStatusLabel(status) {
  return NOTE_STATUSES.find((s) => s.value === status)?.label || "В работе";
}

export function genNoteId() {
  return `note_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function activeNotes(notes) {
  return notes.filter((n) => !n.deletedAt);
}

export function deletedNotes(notes) {
  return notes.filter((n) => n.deletedAt);
}

export function notesForChannel(notes, channelId) {
  return activeNotes(notes).filter((n) => n.channelId === channelId || n.channelId === ALL_CHANNELS);
}
