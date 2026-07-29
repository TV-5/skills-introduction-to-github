// Builds the final API Requirements Document as Markdown from all completed
// section assignments belonging to one api_requirement.
export function generateDocument(requirement, sectionsWithAssignments) {
  const lines = [];

  lines.push(`# API Requirements Document: ${requirement.name}`);
  lines.push("");
  if (requirement.description) {
    lines.push(requirement.description);
    lines.push("");
  }
  lines.push(`_Generated ${new Date().toISOString()}_`);
  lines.push("");

  for (const section of sectionsWithAssignments) {
    lines.push(`## ${section.label}`);
    lines.push("");
    lines.push(`*Provided by ${section.assignment.stakeholderName} (${section.assignment.stakeholderEmail})*`);
    lines.push("");

    const data = section.assignment.data;
    for (const field of section.fields) {
      const value = data[field.key];
      lines.push(`**${field.label}:**`);
      lines.push("");
      lines.push(value && String(value).trim() ? String(value) : "_Not provided_");
      lines.push("");
    }
  }

  return lines.join("\n");
}
