import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MemberCard from "@/pages/MemberCard";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MemberCard />} />
      </Routes>
    </Router>
  );
}
