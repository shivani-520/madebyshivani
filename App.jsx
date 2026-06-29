import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Work from "./pages/Work.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/work" element={<Work />} />
    </Routes>
  );
}