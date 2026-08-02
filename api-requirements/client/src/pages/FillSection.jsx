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

export default function FillSection() {
  const { token } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [data, setData] = useState({});
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api
      .getAssignment(token)
      .then((a) => {
        setAssignment(a);
        setData(a.data ?? {});
      })
      .catch((e) => setError(e.message));
  }, [token]);

  async function save(submit) {
    setError(null);
    setStatus(submit ? "Submitting…" : "Saving…");
    try {
      const updated = await api.saveAssignment(token, data, submit);
      setAssignment(updated);
      setStatus(submit ? "Submitted!" : "Draft saved.");
    } catch (e) {
      const fieldList = e.body?.missingFields ?? e.body?.invalidFields;
      setError(fieldList ? `${e.message}: ${fieldList.join(", ")}` : e.message);
      setStatus(null);
    }
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

      {isCompleted && <p className="status-badge status-completed">Completed</p>}

      <div className="form">
        {assignment.fields.map((field) => (
          <label key={field.key}>
            {field.label}
            {field.required && <span className="required">*</span>}
            <Field
              field={field}
              value={data[field.key]}
              onChange={(v) => setData((prev) => ({ ...prev, [field.key]: v }))}
              disabled={isCompleted}
            />
          </label>
        ))}

        {error && <p className="error">{error}</p>}
        {status && <p className="hint">{status}</p>}

        <div className="form-actions">
          <button type="button" className="button secondary" onClick={() => save(false)} disabled={isCompleted}>
            Save draft
          </button>
          <button type="button" className="button" onClick={() => save(true)} disabled={isCompleted}>
            Submit as complete
          </button>
        </div>
      </div>
    </div>
  );
}
