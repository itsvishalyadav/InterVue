import React from 'react'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { FaTimes } from "react-icons/fa";
import Auth from '../pages/Auth';

function AuthModel({onClose}) {
    const {userData} = useSelector((state)=>state.user)

    useEffect(()=>{
        if(userData){
            onClose()
        }

    },[userData , onClose])

  return (
    <div className='fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/20 px-4 backdrop-blur-sm dark:bg-slate-950/60'>
        <div className='relative w-full max-w-md'>
            <button onClick={onClose} className='absolute right-5 top-8 text-xl text-slate-800 hover:text-black dark:text-slate-200 dark:hover:text-white'>
             <FaTimes size={18}/>
            </button>
            <Auth isModel={true}/>


        </div>

      
    </div>
  )
}

export default AuthModel
