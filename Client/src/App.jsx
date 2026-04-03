import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'

export const ServerUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002'

function App() {
  return (
    <div className='min-h-screen text-slate-100 transition-colors'>
      <Routes>
        <Route path='/' element={<Home />} />
      </Routes>
    </div>
  )
}

export default App
