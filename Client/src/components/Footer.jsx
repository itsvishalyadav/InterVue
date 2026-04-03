import React from 'react'
import BrandMark from './BrandMark'

function Footer() {
  return (
    <div className='flex justify-center border-t border-white/6 px-4 pb-12 pt-8'>
      <div className='w-full max-w-6xl px-3 py-8 text-center'>
        <div className='mb-3 flex items-center justify-center gap-3'>
            <BrandMark className='h-10 w-10' />
            <h2 className='font-semibold text-white'>InterVue</h2>
        </div>
        <p className='mx-auto max-w-2xl text-sm leading-7 text-white/45'>
  AI-powered interview preparation platform designed to improve
          communication skills, technical depth and professional confidence.
        </p>


      </div>
    </div>
  )
}

export default Footer
