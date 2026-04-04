import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import { useSelector } from 'react-redux'
import { motion } from "motion/react";
import {
  BsRobot,
  BsMic,
  BsClock,
  BsBarChart,
  BsFileEarmarkText,
  BsStars,
  BsArrowRight,
} from "react-icons/bs";
import { HiSparkles } from "react-icons/hi";
import { useNavigate } from 'react-router-dom';
import AuthModel from '../components/AuthModel';
import hrImg from "../assets/HR.png";
import techImg from "../assets/tech.png";
import confidenceImg from "../assets/confi.png";
import creditImg from "../assets/credit.png";
import evalImg from "../assets/ai-ans.png";
import resumeImg from "../assets/resume.png";
import pdfImg from "../assets/pdf.png";
import analyticsImg from "../assets/history.png";
import Footer from '../components/Footer';

const capabilityCards = [
  {
    image: evalImg,
    icon: <BsBarChart size={18} />,
    title: "AI Answer Evaluation",
    desc: "Scores communication, correctness, and confidence with practical feedback after every round.",
  },
  {
    image: resumeImg,
    icon: <BsFileEarmarkText size={18} />,
    title: "Resume-Aware Interviews",
    desc: "Generates role-specific and project-based questions from your resume instead of generic mock prompts.",
  },
  {
    image: pdfImg,
    icon: <BsStars size={18} />,
    title: "Executive Reports",
    desc: "Download polished reports with performance trends, question-by-question feedback, and review-ready insights.",
  },
  {
    image: analyticsImg,
    icon: <BsBarChart size={18} />,
    title: "History & Analytics",
    desc: "Track improvement across sessions and revisit interviews with detailed scoring and progress data.",
  },
];

const processCards = [
  {
    icon: <BsRobot size={22} />,
    step: "01",
    title: "Role-Aligned Setup",
    desc: "Choose your target role, experience, and resume context so the interview reflects real expectations.",
  },
  {
    icon: <BsMic size={22} />,
    step: "02",
    title: "Guided Live Interview",
    desc: "Practice with time pressure, speaking flow, coding prompts, and interview-style follow-through.",
  },
  {
    icon: <BsClock size={22} />,
    step: "03",
    title: "Measured Review",
    desc: "Finish with structured evaluation, ATS-style analysis, and practical direction for the next attempt.",
  },
];

const modes = [
  {
    img: hrImg,
    title: "HR Interview Mode",
    desc: "Behavioral questions, communication scoring, and professional response coaching.",
  },
  {
    img: techImg,
    title: "Technical Mode",
    desc: "Coding, debugging, and systems-flavored prompts shaped by your role and resume projects.",
  },
  {
    img: confidenceImg,
    title: "Confidence Signals",
    desc: "Track presence, pacing, and delivery quality while practicing in a more realistic setup.",
  },
  {
    img: creditImg,
    title: "Flexible Credits",
    desc: "Use the platform casually or at scale with a simple credit system for premium runs.",
  },
];

const faqItems = [
  {
    question: "How are the interviews personalized?",
    answer: "We use your selected role, experience, resume text, and projects to generate more targeted interview scenarios.",
  },
  {
    question: "Can I practice both HR and technical rounds?",
    answer: "Yes. You can switch between technical and HR interview modes depending on the kind of preparation you need.",
  },
  {
    question: "Do I get a report after each session?",
    answer: "Every completed interview includes scoring, question-level feedback, and a downloadable report experience.",
  },
  {
    question: "Is coding supported during the interview?",
    answer: "Technical rounds include a live coding workspace with quick-run support for supported languages.",
  },
];

const duplicated = (items) => [...items, ...items];

function CarouselTrack({ items, duration = 30, reverse = false, renderCard }) {
  return (
    <div className='relative'>
      <div className='pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#040507] to-transparent' />
      <div className='pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#040507] to-transparent' />
      <div className='hide-scrollbar overflow-hidden'>
        <motion.div
          className='flex w-max gap-6'
          animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
          transition={{ duration, ease: "linear", repeat: Infinity }}
        >
          {duplicated(items).map((item, index) => renderCard(item, index))}
        </motion.div>
      </div>
    </div>
  );
}

function Home() {
  const { userData } = useSelector((state) => state.user)
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate()

  const goToInterview = () => {
    if (!userData) {
      setShowAuth(true)
      return
    }

    navigate("/interview")
  }

  const goToHistory = () => {
    if (!userData) {
      setShowAuth(true)
      return
    }

    navigate("/history")
  }

  return (
    <div className='relative min-h-screen overflow-hidden bg-transparent text-white'>
      <Navbar />

      <main className='relative z-10 overflow-hidden'>
        <section id='home' className='relative px-6 pb-24 pt-14 sm:pt-20'>
          <div className='relative mx-auto max-w-6xl text-center'>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className='mb-8 flex justify-center'
            >
              <div className='inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80 backdrop-blur'>
                <span className='rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300'>2026</span>
                <span>Interview Intelligence Studio</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className='mx-auto max-w-5xl text-5xl font-medium leading-[0.98] tracking-[-0.04em] text-white sm:text-6xl lg:text-[88px]'
            >
              <span className='bg-[linear-gradient(180deg,#ffffff_0%,#d7fff1_68%,#95f0d2_100%)] bg-clip-text text-transparent'>
                AI-Driven Interview Practice
              </span>
              <span className='block bg-[linear-gradient(180deg,#d7fff1_0%,#8ddcf9_52%,#ffffff_100%)] bg-clip-text text-transparent'>
                Built to sharpen real outcomes.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9 }}
              className='mx-auto mt-8 max-w-2xl text-base leading-8 text-white/55 sm:text-lg'
            >
              Practice technical and behavioral interviews with resume-aware prompts,
              real-time coding space, AI scoring, and structured reports designed to help you improve faster.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
              className='mt-10 flex flex-wrap items-center justify-center gap-4'
            >
              <button
                onClick={goToInterview}
                className='rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-100'
              >
                Start Interview
              </button>
              <button
                onClick={goToHistory}
                className='rounded-2xl border border-white/12 bg-white/[0.06] px-7 py-3.5 text-sm font-semibold text-white/82 backdrop-blur transition hover:bg-white/[0.1]'
              >
                View Reports
              </button>
            </motion.div>

            <div className='relative mx-auto mt-16 max-w-5xl overflow-hidden rounded-[40px] border border-white/8 bg-transparent px-8 pb-16 pt-14 shadow-none'>
              <div className='relative z-10'>
                <div className='mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/55'>
                  <HiSparkles className='text-emerald-300' />
                  Trusted Interview Workflow
                </div>
                <div className='mt-16 grid grid-cols-2 gap-6 text-white/22 sm:grid-cols-4'>
                  {["Resume-aware", "Live coding", "AI scoring", "Progress reports"].map((item) => (
                    <div key={item} className='text-sm font-semibold uppercase tracking-[0.28em]'>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id='about' className='border-t border-white/6 px-6 py-24'>
          <div className='mx-auto max-w-5xl text-center'>
            <div className='mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/70'>
              <BsStars className='text-emerald-300' />
              About InterVue
            </div>
            <h2 className='text-4xl font-medium leading-tight tracking-[-0.03em] sm:text-5xl'>
              <span className='bg-[linear-gradient(90deg,#ffffff_8%,#d8fff0_42%,#8adcf6_100%)] bg-clip-text text-transparent'>
              Built on clarity, realism, and high-signal feedback for candidates who want better interview outcomes.
              </span>
            </h2>
            <p className='mx-auto mt-8 max-w-3xl text-lg leading-8 text-white/50'>
              We combine AI-generated mock interviews, resume context, live coding workflow,
              ATS-style scoring, and progress analytics into one system that feels polished enough for serious preparation.
            </p>
          </div>
        </section>

        <section id='portfolio' className='px-6 py-10'>
          <div className='mx-auto max-w-6xl'>
            <div className='mb-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
              <div>
                <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/70'>
                  <BsRobot className='text-emerald-300' />
                  Core Capabilities
                </div>
                <h2 className='max-w-2xl text-4xl font-medium tracking-[-0.03em] sm:text-5xl'>
                  <span className='bg-[linear-gradient(90deg,#ffffff_10%,#d8fff1_52%,#93e5ff_100%)] bg-clip-text text-transparent'>
                  Premium interview tooling, presented like a modern AI studio.
                  </span>
                </h2>
              </div>
              <p className='max-w-xl text-sm leading-7 text-white/50 sm:text-base'>
                The platform combines realistic interview execution with polished evaluation layers,
                so candidates can practice in a more credible environment.
              </p>
            </div>

            <CarouselTrack
              items={capabilityCards}
              duration={34}
              renderCard={(item, index) => (
                <motion.div
                  key={`${item.title}-${index}`}
                  whileHover={{ y: -10, scale: 1.015 }}
                  className='group w-[min(30rem,82vw)] overflow-hidden rounded-[32px] border border-white/8 bg-white/[0.035] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.18)] transition hover:border-emerald-500/35 hover:bg-white/[0.055]'
                >
                  <div className='flex flex-col gap-8'>
                    <div className='flex items-center gap-4'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.16)]'>
                        {item.icon}
                      </div>
                      <h3 className='text-2xl font-semibold text-white'>{item.title}</h3>
                    </div>
                    <p className='text-base leading-7 text-white/55'>{item.desc}</p>
                    <div className='rounded-[28px] border border-white/8 bg-black/30 p-6 transition group-hover:border-emerald-500/20'>
                      <img src={item.image} alt={item.title} className='h-auto max-h-64 w-full object-contain transition duration-300 group-hover:scale-[1.03]' />
                    </div>
                  </div>
                </motion.div>
              )}
            />
          </div>
        </section>

        <section className='px-6 py-24'>
          <div className='mx-auto max-w-6xl'>
            <div className='mb-16 text-center'>
              <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/70'>
                <BsMic className='text-emerald-300' />
                Workflow
              </div>
              <h2 className='text-4xl font-medium tracking-[-0.03em] sm:text-5xl'>
                <span className='bg-[linear-gradient(90deg,#ffffff_12%,#dbfff2_48%,#95dfff_100%)] bg-clip-text text-transparent'>
                A cleaner process from setup to scored review.
                </span>
              </h2>
            </div>

            <CarouselTrack
              items={processCards}
              duration={26}
              reverse
              renderCard={(item, index) => (
                <motion.div
                  key={`${item.step}-${index}`}
                  whileHover={{ y: -8, rotateX: 3 }}
                  className='w-[min(24rem,78vw)] rounded-[28px] border border-white/8 bg-white/[0.03] p-8 transition hover:border-emerald-500/30 hover:bg-white/[0.05]'
                >
                  <div className='mb-6 flex items-center justify-between'>
                    <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300'>
                      {item.icon}
                    </div>
                    <span className='text-xs font-semibold tracking-[0.3em] text-white/28'>{item.step}</span>
                  </div>
                  <h3 className='text-2xl font-semibold text-white'>{item.title}</h3>
                  <p className='mt-4 text-base leading-7 text-white/55'>{item.desc}</p>
                </motion.div>
              )}
            />
          </div>
        </section>

        <section id='contact' className='px-6 py-10'>
          <div className='mx-auto max-w-6xl'>
            <div className='mb-10'>
              <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/70'>
                <BsStars className='text-emerald-300' />
                Practice Modes
              </div>
              <h2 className='max-w-3xl text-4xl font-medium tracking-[-0.03em] sm:text-5xl'>
                <span className='bg-[linear-gradient(90deg,#ffffff_12%,#d9fff1_50%,#8ce0ff_100%)] bg-clip-text text-transparent'>
                Explore the platform through animated product lanes instead of static boxes.
                </span>
              </h2>
            </div>

            <CarouselTrack
              items={modes}
              duration={28}
              renderCard={(mode, index) => (
                <motion.div
                  key={`${mode.title}-${index}`}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className='flex w-[min(28rem,84vw)] items-center justify-between gap-6 rounded-[30px] border border-white/8 bg-white/[0.04] p-8 transition hover:border-emerald-500/30 hover:bg-white/[0.055]'
                >
                  <div className='max-w-xs'>
                    <h3 className='text-2xl font-semibold text-white'>{mode.title}</h3>
                    <p className='mt-4 text-sm leading-7 text-white/55'>{mode.desc}</p>
                  </div>
                  <img src={mode.img} alt={mode.title} className='h-28 w-28 object-contain opacity-95 transition duration-300 group-hover:scale-105' />
                </motion.div>
              )}
            />
          </div>
        </section>

        <section id='faq' className='px-6 py-24'>
          <div className='mx-auto max-w-5xl'>
            <div className='mb-12 text-center'>
              <div className='mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/70'>
                <BsFileEarmarkText className='text-emerald-300' />
                FAQ
              </div>
              <h2 className='text-4xl font-medium tracking-[-0.03em] sm:text-5xl'>
                <span className='bg-[linear-gradient(90deg,#ffffff_10%,#dbfff2_44%,#94dfff_100%)] bg-clip-text text-transparent'>
                Questions candidates usually ask before starting.
                </span>
              </h2>
            </div>

            <div className='space-y-4'>
              {faqItems.map((item) => (
                <div key={item.question} className='rounded-[24px] border border-white/8 bg-white/[0.03] p-6'>
                  <h3 className='text-lg font-semibold text-white'>{item.question}</h3>
                  <p className='mt-3 text-sm leading-7 text-white/55'>{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className='px-6 pb-24'>
          <div className='mx-auto max-w-6xl overflow-hidden rounded-[36px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-10 sm:p-14'>
            <div className='grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end'>
              <div>
                <div className='mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/70'>
                  <BsArrowRight className='text-emerald-300' />
                  Launch Your Next Practice Session
                </div>
                <h2 className='max-w-3xl text-4xl font-medium tracking-[-0.03em] sm:text-5xl'>
                  <span className='bg-[linear-gradient(90deg,#ffffff_12%,#dcfff4_44%,#94deff_100%)] bg-clip-text text-transparent'>
                  Move from scattered preparation to a more premium interview routine.
                  </span>
                </h2>
              </div>

              <div className='flex flex-wrap justify-start gap-4 lg:justify-end'>
                <button
                  onClick={goToInterview}
                  className='rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-emerald-100'
                >
                  Start Interview
                </button>
                <button
                  onClick={() => navigate("/pricing")}
                  className='rounded-2xl border border-white/12 bg-white/[0.06] px-7 py-3.5 text-sm font-semibold text-white/82 backdrop-blur transition hover:bg-white/[0.1]'
                >
                  Explore Plans
                </button>
              </div>
            </div>
          </div>
        </section>

        
      </main>

      {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}

      <Footer />
    </div>
  )
}

export default Home
