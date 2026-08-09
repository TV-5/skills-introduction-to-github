import { Link } from "react-router-dom";

export default function BackLink({ to, children = "Back" }) {
  return (
    <Link className="back-link" to={to}>
      ← {children}
    </Link>
  );
}
