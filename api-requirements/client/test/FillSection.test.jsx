import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import FillSection from "../src/pages/FillSection.jsx";
import { api } from "../src/api.js";

vi.mock("../src/api.js", () => ({
  api: {
    getAssignment: vi.fn(),
    saveAssignment: vi.fn(),
  },
}));

const baseAssignment = {
  requirementName: "Orders API",
  sectionKey: "payload",
  sectionLabel: "Payload & Data Model",
  sectionDescription: "Request/response shape.",
  fields: [
    { key: "request_payload", label: "Request payload", type: "textarea", required: true },
    { key: "response_payload", label: "Response payload", type: "textarea", required: true },
  ],
  stakeholderName: "Alice",
  stakeholderEmail: "alice@example.com",
  status: "pending",
  data: {},
  completedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/fill/test-token"]}>
      <Routes>
        <Route path="/fill/:token" element={<FillSection />} />
      </Routes>
    </MemoryRouter>
  );
}

it("shows the server's missingFields list in the error after a failed submit", async () => {
  api.getAssignment.mockResolvedValue(baseAssignment);
  const err = new Error("missing required fields");
  err.body = { missingFields: ["Response payload"] };
  api.saveAssignment.mockRejectedValue(err);

  renderPage();
  await screen.findByText("Payload & Data Model");

  fireEvent.click(screen.getByRole("button", { name: /submit as complete/i }));

  await waitFor(() =>
    expect(screen.getByText("missing required fields: Response payload")).toBeInTheDocument()
  );
});

it("disables every field and both action buttons once a section is completed", async () => {
  api.getAssignment.mockResolvedValue({ ...baseAssignment, status: "completed" });

  renderPage();
  await screen.findByText("Payload & Data Model");

  expect(screen.getByRole("textbox", { name: /request payload/i })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: /response payload/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /save draft/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /submit as complete/i })).toBeDisabled();
});
