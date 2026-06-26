import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import StockIn from './pages/StockIn'
import StockOut from './pages/StockOut'
import Notifications from './pages/Notifications'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/stock-in" element={<StockIn />} />
      <Route path="/stock-out" element={<StockOut />} />
      <Route path="/notifications" element={<Notifications />} />
    </Routes>
  )
}

export default App
