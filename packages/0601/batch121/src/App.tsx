import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Handover from '@/pages/Handover'
import Success from '@/pages/Success'
import Records from '@/pages/Records'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Handover />} />
        <Route path="/success" element={<Success />} />
        <Route path="/records" element={<Records />} />
      </Routes>
    </Router>
  )
}
