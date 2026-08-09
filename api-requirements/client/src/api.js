async function request(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(body.error || `Request failed: ${res.status}`);
    error.status = res.status;
    error.body = body;
    throw error;
  }
  return body;
}

export const api = {
  getSession: () => request("/admin/session"),
  login: (password) => request("/admin/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request("/admin/logout", { method: "POST" }),

  listSections: () => request("/sections"),
  listRequirements: () => request("/requirements"),
  getRequirement: (id) => request(`/requirements/${id}`),
  createRequirement: (payload) =>
    request("/requirements", { method: "POST", body: JSON.stringify(payload) }),
  deleteRequirement: (id) => request(`/requirements/${id}`, { method: "DELETE" }),
  getDocument: (id) => request(`/requirements/${id}/document`),
  getDocumentPdf: async (id) => {
    const res = await fetch(`/api/requirements/${id}/document/pdf`, { credentials: "same-origin" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const error = new Error(body.error || `Request failed: ${res.status}`);
      error.status = res.status;
      error.body = body;
      throw error;
    }
    return res.blob();
  },

  reassignSection: (requirementId, assignmentId, stakeholderName, stakeholderEmail) =>
    request(`/requirements/${requirementId}/assignments/${assignmentId}`, {
      method: "PATCH",
      body: JSON.stringify({ stakeholderName, stakeholderEmail }),
    }),
  regenerateSectionLink: (requirementId, assignmentId) =>
    request(`/requirements/${requirementId}/assignments/${assignmentId}/regenerate-link`, {
      method: "POST",
    }),
  sendSectionLink: (requirementId, assignmentId, email) =>
    request(`/requirements/${requirementId}/assignments/${assignmentId}/send-link`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  getAssignment: (token) => request(`/assignments/${token}`),
  saveAssignment: (token, data, submit) =>
    request(`/assignments/${token}`, {
      method: "PUT",
      body: JSON.stringify({ data, submit }),
    }),
};
