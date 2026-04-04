import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from "motion/react"
import { BsCoin } from "react-icons/bs";
import { HiOutlineLogout } from "react-icons/hi";
import { FaUserAstronaut } from "react-icons/fa";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ServerUrl } from '../App';
import { setUserData } from '../redux/userSlice';
import AuthModel from './AuthModel';
import BrandMark from './BrandMark';

const navItems = [
  { label: "Home", id: "home" },
  { label: "About", id: "about" },
  { label: "Portfolio", id: "portfolio" },
  { label: "Contact", id: "contact" },
  { label: "FAQ", id: "faq" },
]

function Navbar() {
    const {userData} = useSelector((state)=>state.user)
    const [showCreditPopup,setShowCreditPopup] = useState(false)
    const [showUserPopup,setShowUserPopup] = useState(false)
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [showAuth, setShowAuth] = useState(false);

    const scrollToSection = (id) => {
        const element = document.getElementById(id)
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }

    const handleLogout = async () => {
        try {
            await axios.get(ServerUrl + "/api/auth/logout" , {withCredentials:true})
            dispatch(setUserData(null))
            setShowCreditPopup(false)
            setShowUserPopup(false)
            navigate("/")

        } catch (error) {
            console.log(error)
        }
    }
  return (
    <div className='sticky top-0 z-50 flex justify-center px-4 pt-5'>
        <motion.div 
        initial={{opacity:0 , y:-40}}
        animate={{opacity:1 , y:0}}
        transition={{duration: 0.3}}
        className='w-full max-w-6xl rounded-[24px] border border-white/10 bg-[#0a0d11]/80 px-6 py-4 flex justify-between items-center relative shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl'>
            <div className='flex items-center gap-3 cursor-pointer' onClick={() => scrollToSection("home")}>
                <BrandMark className='h-10 w-10' />
                <h1 className='hidden text-lg font-semibold tracking-[-0.03em] text-white md:block'>InterVue</h1>
            </div>

            <div className='hidden items-center gap-8 md:flex'>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        type='button'
                        onClick={() => scrollToSection(item.id)}
                        className='text-sm text-white/62 transition hover:text-white'
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <div className='flex items-center gap-4 relative'>
                <div className='relative'>
                    <button onClick={()=>{
                        if(!userData){
                            setShowAuth(true)
                            return;
                        }
                        setShowCreditPopup(!showCreditPopup);
                        setShowUserPopup(false)
                    }} className='flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-md text-white/82 transition hover:bg-white/[0.1]'>
                        <BsCoin size={20}/>
                        {userData?.credits || 0}
                    </button>

                    {showCreditPopup && (
                        <div className='absolute right-[-50px] z-50 mt-3 w-64 rounded-xl border border-white/10 bg-[#0e0e10] p-5 shadow-xl'>
                            <p className='mb-4 text-sm text-white/65'>Need more credits to continue interviews?</p>
                            <button onClick={()=>navigate("/pricing")} className='w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-black'>Buy more credits</button>

                        </div>
                    )}
                </div>

                <div className='relative'>
                    {!userData && (
                        <button
                            type='button'
                            onClick={() => navigate("/pricing")}
                            className='hidden rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 lg:inline-flex'
                        >
                            Get In Touch
                        </button>
                    )}
                    <button
                    onClick={()=>{
                        if(!userData){
                            setShowAuth(true)
                            return;
                        }
                        setShowUserPopup(!showUserPopup);
                        setShowCreditPopup(false)
                    }} className='flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.1] font-semibold text-white'>
                        {userData ? userData?.name.slice(0,1).toUpperCase() : <FaUserAstronaut size={16}/>}
                        
                    </button>

                    {showUserPopup && (
                        <div className='absolute right-0 z-50 mt-3 w-48 rounded-xl border border-white/10 bg-[#0e0e10] p-4 shadow-xl'>
                            <p className='mb-1 text-md font-medium text-emerald-400'>{userData?.name}</p>

                            <button onClick={()=>navigate("/history")} className='w-full py-2 text-left text-sm text-white/70 hover:text-white'>InterView History</button>
                            <button onClick={handleLogout} 
                            className='w-full text-left text-sm py-2 flex items-center gap-2 text-red-500'>
                                <HiOutlineLogout size={16}/>
                                Logout</button>
                        </div>
                    )}
                </div>

            </div>



        </motion.div>

        {showAuth && <AuthModel onClose={()=>setShowAuth(false)}/>}
      
    </div>
  )
}

export default Navbar
