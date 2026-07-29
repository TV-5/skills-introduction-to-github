import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import CreateRequirement from "./pages/CreateRequirement.jsx";
import RequirementDetail from "./pages/RequirementDetail.jsx";
import FillSection from "./pages/FillSection.jsx";
import Document from "./pages/Document.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import RequireAuth from "./components/RequireAuth.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/fill/:token" element={<FillSection />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<CreateRequirement />} />
        <Route path="/requirements/:id" element={<RequirementDetail />} />
        <Route path="/requirements/:id/document" element={<Document />} />
      </Route>
    </Routes>
  );
}
