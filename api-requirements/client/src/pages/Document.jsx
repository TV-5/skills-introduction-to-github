import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";

export default function Document() {
  const { id } = useParams();
  const [markdown, setMarkdown] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getDocument(id)
      .then((doc) => setMarkdown(doc.markdown))
      .catch((e) => setError(e.body?.error || e.message));
  }, [id]);

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-requirements-${id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p className="error">{error}</p>;
  if (!markdown) return <p>Loading…</p>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Compiled Document</h1>
        <div className="form-actions">
          <button className="button secondary" onClick={() => navigator.clipboard.writeText(markdown)}>
            Copy Markdown
          </button>
          <button className="button" onClick={download}>
            Download .md
          </button>
        </div>
      </div>
      <pre className="document-preview">{markdown}</pre>
    </div>
  );
}
