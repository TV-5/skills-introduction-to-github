import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import BackLink from "../components/BackLink.jsx";

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

  async function downloadPdf() {
    try {
      const blob = await api.getDocumentPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `api-requirements-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.body?.error || e.message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!markdown) return <p>Loading…</p>;

  return (
    <div className="page">
      <BackLink to={`/requirements/${id}`}>Requirement</BackLink>
      <div className="page-header">
        <h1>Compiled Document</h1>
        <div className="form-actions">
          <button className="button secondary" onClick={() => navigator.clipboard.writeText(markdown)}>
            Copy Markdown
          </button>
          <button className="button secondary" onClick={download}>
            Download .md
          </button>
          <button className="button" onClick={downloadPdf}>
            Download PDF
          </button>
        </div>
      </div>
      <pre className="document-preview">{markdown}</pre>
    </div>
  );
}
