// A completed section stays editable by its stakeholder for a few days after
// submission, then locks permanently. Shared by the assignments route (which
// enforces it) and the requirements route (which reports it to the admin UI).
export const EDIT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export function computeEditWindow(status, completedAt) {
  if (status !== "completed" || !completedAt) {
    return { editableUntil: null, canEdit: false };
  }
  const editableUntil = new Date(new Date(completedAt).getTime() + EDIT_WINDOW_MS).toISOString();
  return { editableUntil, canEdit: Date.now() <= new Date(editableUntil).getTime() };
}
