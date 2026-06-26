import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SessionPage from "@/pages/SessionPage";
import SeatPage from "@/pages/SeatPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SessionPage />} />
        <Route path="/seats/:sessionId" element={<SeatPage />} />
      </Routes>
    </Router>
  );
}
