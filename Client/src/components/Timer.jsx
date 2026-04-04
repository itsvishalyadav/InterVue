import React from 'react'
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
function Timer({ timeLeft, totalTime }) {
    const safeTotal = totalTime || 1
    const percentage = Math.max(0, (timeLeft / safeTotal) * 100)
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const display = `${minutes}:${String(seconds).padStart(2, '0')}`
  return (
    <div className='w-20 h-20'>
        <CircularProgressbar
        value={percentage}
        text={display}
        styles={buildStyles({
          textSize: "18px",
          pathColor: "#10b981",
          textColor: "#ef4444",
          trailColor: "#e5e7eb",
        })}
        />
      
    </div>
  )
}

export default Timer
