import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaCheck } from 'react-icons/fa'
import Step1SetUp from '../components/Step1SetUp'
import Step2Interview from '../components/Step2Interview'
import Step3Report from '../components/Step3Report'
import ThemeToggle from '../components/ThemeToggle'

function Interview() {
    const [step, setStep] = useState(1)
    const [interviewData, setInterviewData] = useState(null)
    const navigate = useNavigate()

    const steps = useMemo(() => ([
        { id: 1, label: 'Setup' },
        { id: 2, label: 'Interview' },
        { id: 3, label: 'Report' }
    ]), [])

    const handleBack = () => {
        if (step === 1) {
            navigate('/')
            return
        }
        setStep((prev) => prev - 1)
    }

    return (
        <div className='min-h-screen bg-transparent'>
            <div className='sticky top-0 z-20 border-b border-white/60 bg-white/75 backdrop-blur dark:border-slate-800 dark:bg-slate-950/75'>
                <div className='mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6'>
                    <button
                        onClick={handleBack}
                        className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
                    >
                        <FaArrowLeft size={12} /> {step === 1 ? 'Back Home' : 'Previous Step'}
                    </button>

                    <div className='flex items-center gap-3 sm:gap-4'>
                        {steps.map((item) => {
                            const isActive = step === item.id
                            const isDone = step > item.id
                            const badgeClass = isActive
                                ? 'bg-emerald-600 text-white shadow'
                                : isDone
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                            const labelClass = isActive ? 'text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-300'

                            return (
                                <div key={item.id} className='flex items-center gap-2'>
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${badgeClass}`}>
                                        {isDone ? <FaCheck size={12} /> : item.id}
                                    </div>
                                    <span className={`hidden text-sm font-medium sm:block ${labelClass}`}>{item.label}</span>
                                    {item.id !== steps.length && <div className='hidden h-px w-8 bg-slate-200 dark:bg-slate-700 sm:block' />}
                                </div>
                            )
                        })}
                        <ThemeToggle className='ml-2' />
                    </div>
                </div>
            </div>

            {step === 1 && (
                <Step1SetUp onStart={(data) => {
                    setInterviewData(data)
                    setStep(2)
                }} />
            )}

            {step === 2 && (
                <Step2Interview
                    interviewData={interviewData}
                    onFinish={(report) => {
                        setInterviewData(report)
                        setStep(3)
                    }}
                />
            )}

            {step === 3 && (
                <Step3Report report={interviewData} />
            )}
        </div>
    )
}

export default Interview
