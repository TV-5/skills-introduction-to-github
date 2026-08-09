import PDFDocument from "pdfkit";

const ACCENT = "#2f6fed";
const MUTED = "#666666";
const INK = "#1a1a1a";

// Builds the final API Requirements Document as a formatted PDF from all completed section
// assignments belonging to one api_requirement. Returns an unended PDFDocument stream -
// callers pipe it to a response (or file) and call .end().
export function generatePdf(requirement, sectionsWithAssignments) {
  const doc = new PDFDocument({ margin: 54, size: "A4", bufferPages: true });

  doc.font("Helvetica-Bold").fontSize(22).fillColor(INK).text(requirement.name);
  if (requirement.description) {
    doc.moveDown(0.4).font("Helvetica").fontSize(11).fillColor(MUTED).text(requirement.description);
  }
  doc
    .moveDown(0.4)
    .font("Helvetica")
    .fontSize(9)
    .fillColor(MUTED)
    .text(`Generated ${new Date().toLocaleString()}`);

  for (const section of sectionsWithAssignments) {
    doc.moveDown(1.2);
    drawRule(doc);
    doc.moveDown(0.6);

    doc.font("Helvetica-Bold").fontSize(15).fillColor(ACCENT).text(section.label);
    doc
      .font("Helvetica-Oblique")
      .fontSize(9.5)
      .fillColor(MUTED)
      .text(`Provided by ${section.assignment.stakeholderName} (${section.assignment.stakeholderEmail})`);
    doc.moveDown(0.5);

    for (const field of section.fields) {
      const value = section.assignment.data[field.key];

      doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK).text(field.label);
      doc.moveDown(0.15);
      doc
        .font("Helvetica")
        .fontSize(10.5)
        .fillColor(value && String(value).trim() ? INK : MUTED)
        .text(value && String(value).trim() ? String(value) : "Not provided", {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        });
      doc.moveDown(0.6);
    }
  }

  addPageNumbers(doc);

  return doc;
}

function drawRule(doc) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  doc
    .moveTo(left, doc.y)
    .lineTo(right, doc.y)
    .strokeColor("#d0d0d5")
    .lineWidth(1)
    .stroke();
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(`Page ${i + 1} of ${range.count}`, 0, doc.page.height - doc.page.margins.bottom + 18, {
        align: "center",
      });
  }
}
