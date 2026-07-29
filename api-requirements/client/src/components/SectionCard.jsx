const STATUS_LABEL = {
  pending: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export default function SectionCard({ section }) {
  const fillLink = `${window.location.origin}/fill/${section.accessToken}`;

  return (
    <div className={`section-card status-${section.status}`}>
      <div className="section-card-header">
        <h3>{section.label}</h3>
        <span className={`status-badge status-${section.status}`}>{STATUS_LABEL[section.status]}</span>
      </div>
      <p className="section-card-description">{section.description}</p>
      <p className="section-card-stakeholder">
        Stakeholder: {section.stakeholderName} ({section.stakeholderEmail})
      </p>
      <div className="section-card-link">
        <input readOnly value={fillLink} onFocus={(e) => e.target.select()} />
        <button type="button" onClick={() => navigator.clipboard.writeText(fillLink)}>
          Copy link
        </button>
      </div>
    </div>
  );
}
