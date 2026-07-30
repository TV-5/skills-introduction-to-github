import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireAuth from "../src/components/RequireAuth.jsx";
import { useAuth } from "../src/auth.jsx";

vi.mock("../src/auth.jsx", () => ({
  useAuth: vi.fn(),
}));

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/admin/login" element={<div>Login Page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

it("redirects to /admin/login when not authenticated", () => {
  useAuth.mockReturnValue({ authenticated: false, logout: vi.fn() });

  renderProtectedRoute();

  expect(screen.getByText("Login Page")).toBeInTheDocument();
  expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
});

it("renders the protected content when authenticated", () => {
  useAuth.mockReturnValue({ authenticated: true, logout: vi.fn() });

  renderProtectedRoute();

  expect(screen.getByText("Protected Content")).toBeInTheDocument();
  expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
});
