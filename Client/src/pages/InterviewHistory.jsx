import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from "axios"
import { ServerUrl } from '../App'
import { FaArrowLeft } from 'react-icons/fa'
import ThemeToggle from '../components/ThemeToggle'
function InterviewHistory() {
    const [interviews, setInterviews] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        const getMyInterviews = async () => {
            try {
                const result = await axios.get(ServerUrl + "/api/interview/get-interview", { withCredentials: true })

                setInterviews(result.data)

            } catch (error) {
                console.log(error)
            }

        }

        getMyInterviews()

    }, [])


    return (
        <div className='min-h-screen bg-transparent py-10' >
            <div className='w-[90vw] lg:w-[70vw] max-w-[90%] mx-auto'>

                <div className='mb-10 flex w-full flex-wrap items-start justify-between gap-4'>
                  <div className='flex items-start gap-4 flex-wrap'>
                    <button
                        onClick={() => navigate("/")}
                        className='mt-1 rounded-full bg-white/85 p-3 shadow transition hover:shadow-md dark:bg-slate-900/88'><FaArrowLeft className='text-slate-600 dark:text-slate-200' /></button>

                    <div>
                        <h1 className='text-3xl font-bold flex-nowrap text-slate-900 dark:text-slate-50'>
                            Interview History
                        </h1>
                        <p className='mt-2 text-slate-500 dark:text-slate-300'>
                            Track your past interviews and performance reports
                        </p>

                    </div>
                  </div>
                  <ThemeToggle />
                </div>


                {interviews.length === 0 ?
                    <div className='rounded-2xl border border-white/70 bg-white/88 p-10 text-center shadow dark:border-slate-700/80 dark:bg-slate-900/88'>
                        <p className='text-slate-500 dark:text-slate-300'>
                            No interviews found. Start your first interview.
                        </p>

                    </div>

                    :

                    <div className='grid gap-6'>
                        {interviews.map((item, index) => (
                            <div key={index}
                            onClick={()=>navigate(`/report/${item._id}`)}
                             className='cursor-pointer rounded-2xl border border-white/70 bg-white/88 p-6 shadow-md transition-all duration-300 hover:shadow-xl dark:border-slate-700/80 dark:bg-slate-900/88'>
                                <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                                            {item.role}
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                            {item.experience} • {item.mode}
                                        </p>

                                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className='flex items-center gap-6'>

                                        {/* SCORE */}
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-emerald-600">
                                                {item.finalScore || 0}/10
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                                Overall Score
                                            </p>
                                        </div>

                                        {/* STATUS BADGE */}
                                        <span
                                            className={`px-4 py-1 rounded-full text-xs font-medium ${item.status === "completed"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                                }`}
                                        >
                                            {item.status}
                                        </span>


                                    </div>
                                </div>

                            </div>

                        ))
                        }

                    </div>
                }
            </div>

        </div>
    )
}

export default InterviewHistory
