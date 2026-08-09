import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import ProgressBar from "../components/ProgressBar.jsx";
import SectionCard from "../components/SectionCard.jsx";
import BackLink from "../components/BackLink.jsx";

export default function RequirementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setRequirement(await api.getRequirement(id));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleReassign(assignmentId, name, email) {
    setRequirement(await api.reassignSection(id, assignmentId, name, email));
  }

  async function handleRegenerateLink(assignmentId) {
    setRequirement(await api.regenerateSectionLink(id, assignmentId));
  }

  async function handleSendLink(assignmentId, email) {
    await api.sendSectionLink(id, assignmentId, email);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${requirement.name}" and all of its section data? This cannot be undone.`)) {
      return;
    }
    await api.deleteRequirement(id);
    navigate("/");
  }

  if (error) return <p className="error">{error}</p>;
  if (!requirement) return <p>Loading…</p>;

  return (
    <div className="page">
      <BackLink to="/">Dashboard</BackLink>
      <div className="page-header">
        <h1>{requirement.name}</h1>
        <div className="form-actions">
          {requirement.isComplete ? (
            <Link className="button" to={`/requirements/${id}/document`}>
              View Document
            </Link>
          ) : (
            <button className="button" disabled title="All sections must be completed first">
              View Document
            </button>
          )}
          <button type="button" className="button danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
      {requirement.description && <p>{requirement.description}</p>}

      <ProgressBar completed={requirement.completedSections} total={requirement.totalSections} />

      <div className="section-card-list">
        {requirement.sections.map((s) => (
          <SectionCard
            key={s.assignmentId}
            section={s}
            onReassign={handleReassign}
            onRegenerateLink={handleRegenerateLink}
            onSendLink={handleSendLink}
          />
        ))}
      </div>
    </div>
  );
}
