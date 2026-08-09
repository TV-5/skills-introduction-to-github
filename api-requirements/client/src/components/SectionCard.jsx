import { useState } from "react";

const STATUS_LABEL = {
  pending: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

export default function SectionCard({ section, onReassign, onRegenerateLink, onSendLink }) {
  const fillLink = `${window.location.origin}/fill/${section.accessToken}`;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(section.stakeholderName);
  const [email, setEmail] = useState(section.stakeholderEmail);
  const [busy, setBusy] = useState(false);

  const [showSend, setShowSend] = useState(false);
  const [sendTo, setSendTo] = useState(section.stakeholderEmail);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  async function saveReassign() {
    setBusy(true);
    try {
      await onReassign(section.assignmentId, name, email);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setSending(true);
    setSendResult(null);
    try {
      await onSendLink(section.assignmentId, sendTo);
      setSendResult({ ok: true, message: `Sent to ${sendTo}` });
      setShowSend(false);
    } catch (e) {
      setSendResult({ ok: false, message: e.message });
    } finally {
      setSending(false);
    }
  }

  async function regenerate() {
    if (
      !window.confirm(
        "This revokes the current link and resets this section's progress. The stakeholder will need to start over. Continue?"
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await onRegenerateLink(section.assignmentId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`section-card status-${section.status}`}>
      <div className="section-card-header">
        <h3>{section.label}</h3>
        <span className={`status-badge status-${section.status}`}>{STATUS_LABEL[section.status]}</span>
      </div>
      <p className="section-card-description">{section.description}</p>

      {section.status === "completed" && (
        <p className="hint">
          Submitted {new Date(section.completedAt).toLocaleString()}
          {section.lastEditedAt && ` · last edited ${new Date(section.lastEditedAt).toLocaleString()}`}
          {section.canEdit
            ? ` · stakeholder can still edit until ${new Date(section.editableUntil).toLocaleString()}`
            : " · locked, no further edits"}
        </p>
      )}

      {editing ? (
        <div className="section-card-edit">
          <label>
            Stakeholder name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Stakeholder email
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="button" onClick={saveReassign} disabled={busy}>
              Save
            </button>
            <button type="button" className="button secondary" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="section-card-stakeholder">
          Stakeholder: {section.stakeholderName} ({section.stakeholderEmail}){" "}
          <button type="button" className="link-button" onClick={() => setEditing(true)}>
            Edit
          </button>
        </p>
      )}

      <div className="section-card-link">
        <input readOnly value={fillLink} onFocus={(e) => e.target.select()} />
        <button type="button" onClick={() => navigator.clipboard.writeText(fillLink)}>
          Copy link
        </button>
        <button type="button" className="button secondary" onClick={regenerate} disabled={busy}>
          Regenerate link
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setSendResult(null);
            setShowSend((v) => !v);
          }}
        >
          Send email
        </button>
      </div>

      {showSend && (
        <div className="section-card-edit">
          <label>
            Send link to
            <input type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="button" onClick={send} disabled={sending || !sendTo.trim()}>
              {sending ? "Sending…" : "Send"}
            </button>
            <button type="button" className="button secondary" onClick={() => setShowSend(false)} disabled={sending}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {sendResult && (
        <p className={sendResult.ok ? "hint" : "error"}>{sendResult.message}</p>
      )}
    </div>
  );
}
