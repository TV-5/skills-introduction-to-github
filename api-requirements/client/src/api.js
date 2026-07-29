async function request(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
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
  listSections: () => request("/sections"),
  listRequirements: () => request("/requirements"),
  getRequirement: (id) => request(`/requirements/${id}`),
  createRequirement: (payload) =>
    request("/requirements", { method: "POST", body: JSON.stringify(payload) }),
  getDocument: (id) => request(`/requirements/${id}/document`),
  getAssignment: (token) => request(`/assignments/${token}`),
  saveAssignment: (token, data, submit) =>
    request(`/assignments/${token}`, {
      method: "PUT",
      body: JSON.stringify({ data, submit }),
    }),
};
