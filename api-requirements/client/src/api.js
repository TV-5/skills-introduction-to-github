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

  reassignSection: (requirementId, assignmentId, stakeholderName, stakeholderEmail) =>
    request(`/requirements/${requirementId}/assignments/${assignmentId}`, {
      method: "PATCH",
      body: JSON.stringify({ stakeholderName, stakeholderEmail }),
    }),
  regenerateSectionLink: (requirementId, assignmentId) =>
    request(`/requirements/${requirementId}/assignments/${assignmentId}/regenerate-link`, {
      method: "POST",
    }),

  getAssignment: (token) => request(`/assignments/${token}`),
  saveAssignment: (token, data, submit) =>
    request(`/assignments/${token}`, {
      method: "PUT",
      body: JSON.stringify({ data, submit }),
    }),
};
