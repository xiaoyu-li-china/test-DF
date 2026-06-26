import { useState } from 'react'
import Countdown from './components/Countdown.jsx'
import './App.css'

function App() {
  const [targetDate] = useState(() => Date.now() + 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 30 * 60 * 1000 + 15 * 1000)

  const handleEnd = () => {
    console.log('倒计时已结束！')
  }

  return (
    <div className="app">
      <h1>倒计时组件</h1>
      <Countdown targetDate={targetDate} onEnd={handleEnd} />
    </div>
  )
}

export default App
