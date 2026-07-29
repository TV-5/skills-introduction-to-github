import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function CreateRequirement() {
  const navigate = useNavigate();
  const [sections, setSections] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stakeholders, setStakeholders] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.listSections().then(setSections).catch((e) => setError(e.message));
  }, []);

  function updateStakeholder(sectionKey, field, value) {
    setStakeholders((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [field]: value },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const assignments = Object.entries(stakeholders)
      .filter(([, v]) => v?.name?.trim() && v?.email?.trim())
      .map(([sectionKey, v]) => ({
        sectionKey,
        stakeholderName: v.name.trim(),
        stakeholderEmail: v.email.trim(),
      }));

    if (assignments.length === 0) {
      setError("Assign at least one stakeholder to a section.");
      return;
    }

    setSubmitting(true);
    try {
      const requirement = await api.createRequirement({ name, description, assignments });
      navigate(`/requirements/${requirement.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>New API Requirement</h1>
      <form onSubmit={handleSubmit} className="form">
        <label>
          API name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <h2>Assign stakeholders per section</h2>
        <p className="hint">
          Leave a section blank to skip it. Each assigned stakeholder gets a private link to fill
          in just their section, and can do so independently of the others.
        </p>

        {sections?.map((s) => (
          <fieldset key={s.key} className="section-assignment">
            <legend>{s.label}</legend>
            <p className="hint">{s.description}</p>
            <label>
              Stakeholder name
              <input
                value={stakeholders[s.key]?.name ?? ""}
                onChange={(e) => updateStakeholder(s.key, "name", e.target.value)}
              />
            </label>
            <label>
              Stakeholder email
              <input
                type="email"
                value={stakeholders[s.key]?.email ?? ""}
                onChange={(e) => updateStakeholder(s.key, "email", e.target.value)}
              />
            </label>
          </fieldset>
        ))}

        {error && <p className="error">{error}</p>}

        <button type="submit" className="button" disabled={submitting || !sections}>
          {submitting ? "Creating…" : "Create & generate links"}
        </button>
      </form>
    </div>
  );
}
