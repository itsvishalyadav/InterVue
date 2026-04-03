import React from 'react'
import { BsCameraVideoFill } from "react-icons/bs";
import { IoSparkles } from "react-icons/io5";
import { motion } from "motion/react"
import { FcGoogle } from "react-icons/fc";
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../utils/firebase';
import axios from 'axios';
import { ServerUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
function Auth({isModel = false}) {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const handleGoogleAuth = async () => {
        try {
            const response = await signInWithPopup(auth,provider)
            let User = response.user
            let name = User.displayName
            let email = User.email
            const result = await axios.post(ServerUrl + "/api/auth/google" , {name , email} , {withCredentials:true})
            dispatch(setUserData(result.data))
            navigate("/")
            


            
        } catch (error) {
            console.log(error)
            alert(error?.response?.data?.message || error?.message || "Google sign-in failed")
              dispatch(setUserData(null))
        }
    }
  return (
    <div className={`
      w-full 
      ${isModel ? "py-4" : "relative min-h-screen flex items-center justify-center px-6 py-20"}
    `}>
        {!isModel && (
          <div className='absolute right-6 top-6'>
            <ThemeToggle />
          </div>
        )}
        <motion.div 
        initial={{opacity:0 , y:-40}} 
        animate={{opacity:1 , y:0}} 
        transition={{duration:1.05}}
        className={`
        w-full 
        ${isModel ? "max-w-md p-8 rounded-3xl" : "max-w-lg p-12 rounded-[32px]"}
        border border-white/70 bg-white/88 shadow-2xl backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/88
      `}>
            <div className='flex items-center justify-center gap-3 mb-6'>
                <div className='relative rounded-lg bg-slate-950 p-2 text-white dark:bg-emerald-500 dark:text-slate-950'>
                    <BsCameraVideoFill size={18}/>
                    <span className='absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-80' />
                </div>
                <h2 className='text-lg font-semibold text-slate-900 dark:text-slate-50'>InterVue</h2>
            </div>

            <h1 className='mb-4 text-center text-2xl font-semibold leading-snug text-slate-900 md:text-3xl dark:text-slate-50'>
                Continue with
                <span className='inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-green-600 dark:bg-emerald-500/20 dark:text-emerald-300'>
                    <IoSparkles size={16}/>
                    InterVue Session

                </span>
            </h1>

            <p className='mb-8 text-center text-sm leading-relaxed text-slate-500 md:text-base dark:text-slate-300'>
                Sign in to start AI-powered mock interviews,
        track your progress, and unlock detailed performance insights.
            </p>


            <motion.button 
            onClick={handleGoogleAuth}
            whileHover={{opacity:0.9 , scale:1.03}}
            whileTap={{opacity:1 , scale:0.98}}
            className='flex w-full items-center justify-center gap-3 rounded-full bg-slate-950 py-3 text-white shadow-md dark:bg-emerald-500 dark:text-slate-950'>
                <FcGoogle size={20}/>
                Continue with Google

   
            </motion.button>
        </motion.div>

      
    </div>
  )
}

export default Auth
