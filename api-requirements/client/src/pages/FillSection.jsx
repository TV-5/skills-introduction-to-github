import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";

function Field({ field, value, onChange, disabled }) {
  if (field.type === "textarea") {
    return (
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={4} disabled={disabled} />
    );
  }
  if (field.type === "select") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">Select…</option>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  return <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

export default function FillSection() {
  const { token } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [data, setData] = useState({});
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    api
      .getAssignment(token)
      .then((a) => {
        setAssignment(a);
        setData(a.data ?? {});
      })
      .catch((e) => setError(e.message));
  }, [token]);

  async function resync() {
    try {
      const a = await api.getAssignment(token);
      setAssignment(a);
      setData(a.data ?? {});
    } catch {
      // best-effort - the error from the failed save is still shown
    }
  }

  async function save(submit) {
    setError(null);
    setStatus(submit ? "Submitting…" : "Saving…");
    try {
      const updated = await api.saveAssignment(token, data, submit);
      setAssignment(updated);
      setData(updated.data ?? {});
      setStatus(submit ? "Submitted!" : "Draft saved.");
      setEditing(false);
    } catch (e) {
      if (e.status === 409) {
        // Already submitted, or the edit window closed, elsewhere/since the page loaded - resync
        // so the review view reflects reality instead of leaving a stale, still-editable form up.
        await resync();
        setEditing(false);
      }
      const fieldList = e.body?.missingFields ?? e.body?.invalidFields;
      setError(fieldList ? `${e.message}: ${fieldList.join(", ")}` : e.message);
      setStatus(null);
    }
  }

  function startEdit() {
    setData(assignment.data ?? {});
    setError(null);
    setStatus(null);
    setEditing(true);
  }

  function cancelEdit() {
    setData(assignment.data ?? {});
    setError(null);
    setStatus(null);
    setEditing(false);
  }

  if (error && !assignment) return <p className="error">{error}</p>;
  if (!assignment) return <p>Loading…</p>;

  const isCompleted = assignment.status === "completed";

  return (
    <div className="page">
      <h1>{assignment.sectionLabel}</h1>
      <p className="hint">
        {assignment.requirementName} &middot; filling as {assignment.stakeholderName}
      </p>
      <p>{assignment.sectionDescription}</p>

      {isCompleted && !editing && (
        <>
          <p className="success-banner">
            ✓ Response submitted on {formatDate(assignment.completedAt)}.
            {assignment.lastEditedAt && ` Last edited on ${formatDate(assignment.lastEditedAt)}.`}
          </p>

          <div className="form">
            {assignment.fields.map((field) => (
              <label key={field.key}>
                {field.label}
                <div className="review-value">
                  {String(data[field.key] ?? "").trim() ? data[field.key] : "—"}
                </div>
              </label>
            ))}
          </div>

          {assignment.canEdit ? (
            <div className="form-actions">
              <button type="button" className="button secondary" onClick={startEdit}>
                Edit response
              </button>
            </div>
          ) : (
            <p className="hint">
              Editing closed on {formatDate(assignment.editableUntil)} — this response is now locked.
            </p>
          )}
        </>
      )}

      {(!isCompleted || editing) && (
        <div className="form">
          {editing && (
            <p className="hint">
              You can edit until {formatDate(assignment.editableUntil)}, after which this section
              locks permanently.
            </p>
          )}

          {assignment.fields.map((field) => (
            <label key={field.key}>
              {field.label}
              {field.required && <span className="required">*</span>}
              <Field
                field={field}
                value={data[field.key]}
                onChange={(v) => setData((prev) => ({ ...prev, [field.key]: v }))}
                disabled={false}
              />
            </label>
          ))}

          {error && <p className="error">{error}</p>}
          {status && <p className="hint">{status}</p>}

          <div className="form-actions">
            {editing ? (
              <>
                <button type="button" className="button" onClick={() => save(true)}>
                  Save changes
                </button>
                <button type="button" className="button secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" className="button secondary" onClick={() => save(false)}>
                  Save draft
                </button>
                <button type="button" className="button" onClick={() => save(true)}>
                  Submit as complete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
