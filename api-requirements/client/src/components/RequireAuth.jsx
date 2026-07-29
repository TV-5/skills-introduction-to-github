import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function RequireAuth() {
  const { authenticated, logout } = useAuth();
  const location = useLocation();

  if (authenticated === null) return <p className="page">Loading…</p>;
  if (!authenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return (
    <>
      <div className="admin-bar">
        <Link to="/">API Requirements</Link>
        <button type="button" className="button secondary" onClick={logout}>
          Log out
        </button>
      </div>
      <Outlet />
    </>
  );
}
