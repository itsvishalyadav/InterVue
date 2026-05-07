import React from 'react'

function BrandMark({ className = "", dotClassName = "" }) {
  return (
    <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(22,28,39,0.92),rgba(8,12,18,0.92))] shadow-[0_0_30px_rgba(16,185,129,0.16)] ${className}`}>
      <div className='absolute inset-[7px] rounded-[10px] border border-emerald-300/12 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_58%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]' />
      <div className='relative flex items-end gap-[3px]'>
        <span className='h-3.5 w-1.5 rounded-full bg-white/86' />
        <span className='h-5.5 w-1.5 rounded-full bg-emerald-300' />
        <span className='h-7 w-1.5 rounded-full bg-cyan-300' />
      </div>
      <span className={`absolute right-[7px] top-[7px] h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)] ${dotClassName}`} />
    </div>
  )
}

export default BrandMark
