// Default section definitions. Each section is one stakeholder's slice of the
// final API Requirements Document. Sections are seeded into the `sections`
// table on first boot so new ones can be added later without touching the UI.
export const SECTION_DEFINITIONS = [
  {
    key: "overview",
    label: "Overview & Business Context",
    description: "Why this API exists and who it serves.",
    sortOrder: 1,
    fields: [
      { key: "business_purpose", label: "Business purpose", type: "textarea", required: true },
      { key: "consumers", label: "Expected consumers", type: "textarea", required: true },
      { key: "success_criteria", label: "Success criteria", type: "textarea", required: false },
    ],
  },
  {
    key: "payload",
    label: "Payload & Data Model",
    description: "Request/response shape and data contract.",
    sortOrder: 2,
    fields: [
      { key: "request_payload", label: "Request payload", type: "textarea", required: true },
      { key: "response_payload", label: "Response payload", type: "textarea", required: true },
      { key: "data_types", label: "Field types & constraints", type: "textarea", required: false },
      { key: "validation_rules", label: "Validation rules", type: "textarea", required: false },
    ],
  },
  {
    key: "security",
    label: "Security & Compliance",
    description: "Authentication, authorization, and data handling rules.",
    sortOrder: 3,
    fields: [
      { key: "auth_mechanism", label: "Authentication mechanism", type: "text", required: true },
      { key: "authorization_model", label: "Authorization model", type: "textarea", required: true },
      {
        key: "data_classification",
        label: "Data classification",
        type: "select",
        options: ["Public", "Internal", "Confidential", "Restricted"],
        required: true,
      },
      { key: "compliance_requirements", label: "Compliance requirements", type: "textarea", required: false },
      { key: "threat_considerations", label: "Threat considerations", type: "textarea", required: false },
    ],
  },
  {
    key: "nfr",
    label: "Non-Functional Requirements",
    description: "Performance, availability, and scaling targets.",
    sortOrder: 4,
    fields: [
      { key: "expected_load", label: "Expected load (req/s)", type: "text", required: false },
      { key: "latency_slo", label: "Latency SLO", type: "text", required: false },
      { key: "availability_target", label: "Availability target", type: "text", required: false },
      { key: "rate_limiting", label: "Rate limiting rules", type: "textarea", required: false },
    ],
  },
  {
    key: "integration",
    label: "Integration & Third-Party Dependencies",
    description: "Upstream/downstream systems this API depends on or feeds.",
    sortOrder: 5,
    fields: [
      { key: "dependent_systems", label: "Dependent internal systems", type: "textarea", required: false },
      { key: "third_party_apis", label: "Third-party APIs used", type: "textarea", required: false },
      { key: "sla_dependencies", label: "SLA dependencies", type: "textarea", required: false },
    ],
  },
];
