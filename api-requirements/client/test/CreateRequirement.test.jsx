import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateRequirement from "../src/pages/CreateRequirement.jsx";
import { api } from "../src/api.js";

vi.mock("../src/api.js", () => ({
  api: {
    listSections: vi.fn(),
    createRequirement: vi.fn(),
  },
}));

const sections = [
  { key: "payload", label: "Payload & Data Model", description: "Request/response shape." },
  { key: "security", label: "Security & Compliance", description: "Auth and data handling." },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.listSections.mockResolvedValue(sections);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateRequirement />
    </MemoryRouter>
  );
}

function fillSection(label, { name, email }) {
  const fieldset = screen.getByText(label).closest("fieldset");
  if (name !== undefined) {
    fireEvent.change(within(fieldset).getByLabelText("Stakeholder name"), { target: { value: name } });
  }
  if (email !== undefined) {
    fireEvent.change(within(fieldset).getByLabelText("Stakeholder email"), { target: { value: email } });
  }
}

it("a section with only the name filled (email left blank) is not silently dropped", async () => {
  renderPage();
  await screen.findByText("Payload & Data Model");

  fireEvent.change(screen.getByLabelText("API name"), { target: { value: "Orders API" } });
  fillSection("Payload & Data Model", { name: "Alice" }); // email left blank
  fillSection("Security & Compliance", { name: "Bob", email: "bob@example.com" });

  fireEvent.click(screen.getByRole("button", { name: /create & generate links/i }));

  await waitFor(() =>
    expect(screen.getByText("Finish or clear the stakeholder name/email for: Payload & Data Model.")).toBeInTheDocument()
  );
  expect(api.createRequirement).not.toHaveBeenCalled();
});

it("submitting with every section blank shows the local validation error and never calls the API", async () => {
  renderPage();
  await screen.findByText("Payload & Data Model");

  fireEvent.change(screen.getByLabelText("API name"), { target: { value: "Orders API" } });
  fireEvent.click(screen.getByRole("button", { name: /create & generate links/i }));

  await waitFor(() =>
    expect(screen.getByText("Assign at least one stakeholder to a section.")).toBeInTheDocument()
  );
  expect(api.createRequirement).not.toHaveBeenCalled();
});

it("a fully-filled section is submitted, and a rejected request shows the error and re-enables the button", async () => {
  api.createRequirement.mockRejectedValue(new Error("name is required"));
  renderPage();
  await screen.findByText("Payload & Data Model");

  fireEvent.change(screen.getByLabelText("API name"), { target: { value: "Orders API" } });
  fillSection("Payload & Data Model", { name: "Alice", email: "alice@example.com" });

  const submitButton = screen.getByRole("button", { name: /create & generate links/i });
  fireEvent.click(submitButton);

  await waitFor(() => expect(screen.getByText("name is required")).toBeInTheDocument());
  expect(api.createRequirement).toHaveBeenCalledWith({
    name: "Orders API",
    description: "",
    assignments: [{ sectionKey: "payload", stakeholderName: "Alice", stakeholderEmail: "alice@example.com" }],
  });
  expect(submitButton).not.toBeDisabled();
});
