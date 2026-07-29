import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import CreateRequirement from "./pages/CreateRequirement.jsx";
import RequirementDetail from "./pages/RequirementDetail.jsx";
import FillSection from "./pages/FillSection.jsx";
import Document from "./pages/Document.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/new" element={<CreateRequirement />} />
      <Route path="/requirements/:id" element={<RequirementDetail />} />
      <Route path="/requirements/:id/document" element={<Document />} />
      <Route path="/fill/:token" element={<FillSection />} />
    </Routes>
  );
}
