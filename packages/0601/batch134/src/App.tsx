import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import SelectionPage from "@/pages/SelectionPage"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SelectionPage />} />
      </Routes>
    </Router>
  )
}
