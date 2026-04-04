import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Interview from './pages/Interview'
import InterviewHistory from './pages/InterviewHistory'
import Pricing from './pages/Pricing'
import InterviewReport from './pages/InterviewReport'
import { useEffect } from 'react'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'


export const ServerUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002'

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    const getUser = async () => {
      try {
        const result = await axios.get(ServerUrl + '/api/user/current-user', { withCredentials: true })
        dispatch(setUserData(result.data))
      } catch (error) {
        console.log(error)
        dispatch(setUserData(null))
      }
    }

    getUser()
  }, [dispatch])

  return (
    <div className='min-h-screen text-slate-100 transition-colors'>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/auth' element={<Auth />} />
        <Route path='/interview' element={<Interview />} />
        <Route path='/history' element={<InterviewHistory />} />
        <Route path='/pricing' element={<Pricing />} />
        <Route path='/report/:id' element={<InterviewReport />} />
      </Routes>
    </div>
  )
}

export default App

