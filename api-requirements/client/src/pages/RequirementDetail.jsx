import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import ProgressBar from "../components/ProgressBar.jsx";
import SectionCard from "../components/SectionCard.jsx";

export default function RequirementDetail() {
  const { id } = useParams();
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

  if (error) return <p className="error">{error}</p>;
  if (!requirement) return <p>Loading…</p>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{requirement.name}</h1>
        {requirement.isComplete ? (
          <Link className="button" to={`/requirements/${id}/document`}>
            View Document
          </Link>
        ) : (
          <button className="button" disabled title="All sections must be completed first">
            View Document
          </button>
        )}
      </div>
      {requirement.description && <p>{requirement.description}</p>}

      <ProgressBar completed={requirement.completedSections} total={requirement.totalSections} />

      <div className="section-card-list">
        {requirement.sections.map((s) => (
          <SectionCard key={s.sectionId} section={s} />
        ))}
      </div>
    </div>
  );
}
