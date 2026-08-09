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
  lastEditedAt: null,
  editableUntil: null,
  canEdit: false,
};

const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

function completedAssignment(overrides = {}) {
  const completedAt = new Date(Date.now() - 60_000).toISOString();
  return {
    ...baseAssignment,
    status: "completed",
    data: { request_payload: "req shape", response_payload: "res shape" },
    completedAt,
    editableUntil: new Date(new Date(completedAt).getTime() + threeDaysMs).toISOString(),
    canEdit: true,
    ...overrides,
  };
}

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

it("once completed: shows the submitted date, a read-only review of the answers, and no editable fields", async () => {
  api.getAssignment.mockResolvedValue(completedAssignment());

  renderPage();
  await screen.findByText("Payload & Data Model");

  expect(screen.getByText(/response submitted on/i)).toBeInTheDocument();
  expect(screen.getByText("req shape")).toBeInTheDocument();
  expect(screen.getByText("res shape")).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /request payload/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /submit as complete/i })).not.toBeInTheDocument();
});

it("within the edit window: offers an Edit response button that reopens the form pre-filled", async () => {
  api.getAssignment.mockResolvedValue(completedAssignment());

  renderPage();
  await screen.findByText("Payload & Data Model");

  fireEvent.click(screen.getByRole("button", { name: /edit response/i }));

  const requestField = screen.getByRole("textbox", { name: /request payload/i });
  expect(requestField).toHaveValue("req shape");
  expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
});

it("after the edit window has closed: no Edit button, shows a locked message instead", async () => {
  api.getAssignment.mockResolvedValue(
    completedAssignment({
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      editableUntil: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      canEdit: false,
    })
  );

  renderPage();
  await screen.findByText("Payload & Data Model");

  expect(screen.queryByRole("button", { name: /edit response/i })).not.toBeInTheDocument();
  expect(screen.getByText(/locked/i)).toBeInTheDocument();
});

it("saving an edit sends the updated data and returns to the read-only review", async () => {
  const completed = completedAssignment();
  api.getAssignment.mockResolvedValue(completed);
  api.saveAssignment.mockResolvedValue({ ...completed, data: { ...completed.data, request_payload: "revised" } });

  renderPage();
  await screen.findByText("Payload & Data Model");
  fireEvent.click(screen.getByRole("button", { name: /edit response/i }));

  fireEvent.change(screen.getByRole("textbox", { name: /request payload/i }), {
    target: { value: "revised" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

  await waitFor(() => expect(screen.getByText("revised")).toBeInTheDocument());
  expect(api.saveAssignment).toHaveBeenCalledWith(
    "test-token",
    expect.objectContaining({ request_payload: "revised" }),
    true
  );
});

it("resyncs to the completed view (instead of leaving a stale form open) on a 409 conflict", async () => {
  api.getAssignment
    .mockResolvedValueOnce(baseAssignment)
    .mockResolvedValueOnce(completedAssignment());
  const err = new Error("section already submitted");
  err.status = 409;
  api.saveAssignment.mockRejectedValue(err);

  renderPage();
  await screen.findByText("Payload & Data Model");

  fireEvent.click(screen.getByRole("button", { name: /submit as complete/i }));

  await waitFor(() => expect(screen.getByText(/response submitted on/i)).toBeInTheDocument());
  expect(api.getAssignment).toHaveBeenCalledTimes(2);
});
