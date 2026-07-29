import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import ProgressBar from "../components/ProgressBar.jsx";

export default function Dashboard() {
  const [requirements, setRequirements] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listRequirements().then(setRequirements).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>API Requirements</h1>
        <Link className="button" to="/new">
          New Requirement
        </Link>
      </div>

      {error && <p className="error">{error}</p>}
      {!requirements && !error && <p>Loading…</p>}

      {requirements && requirements.length === 0 && (
        <p>No API requirements yet. Create one to get started.</p>
      )}

      <ul className="requirement-list">
        {requirements?.map((r) => (
          <li key={r.id}>
            <Link to={`/requirements/${r.id}`} className="requirement-list-item">
              <div className="requirement-list-item-title">
                <strong>{r.name}</strong>
                {r.isComplete && <span className="status-badge status-completed">Ready</span>}
              </div>
              <ProgressBar completed={r.completedSections} total={r.totalSections} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
