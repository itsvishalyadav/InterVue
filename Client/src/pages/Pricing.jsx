import React, { useState } from 'react'
import { FaArrowLeft, FaCheckCircle } from 'react-icons/fa'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from "motion/react";
import axios from 'axios';
import { ServerUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import ThemeToggle from '../components/ThemeToggle';
function Pricing() {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const dispatch = useDispatch()

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "₹0",
      credits: 100,
      description: "Perfect for beginners starting interview preparation.",
      features: [
        "100 AI Interview Credits",
        "Basic Performance Report",
        "Voice Interview Access",
        "Limited History Tracking",
      ],
      default: true,
    },
    {
      id: "basic",
      name: "Starter Pack",
      price: "₹99",
      credits: 500,
      description: "Great for focused practice and skill improvement.",
      features: [
        "500 AI Interview Credits",
        "Detailed Feedback",
        "Performance Analytics",
        "Full Interview History",
      ],
    },
    {
      id: "pro",
      name: "Pro Pack",
      price: "₹149",
      credits: 2000,
      description: "Best value for serious job preparation.",
      features: [
        "2000 AI Interview Credits",
        "Advanced AI Feedback",
        "Skill Trend Analysis",
        "Priority AI Processing",
      ],
      badge: "Best Value",
    },
  ];



  const handlePayment = async (plan) => {
    try {
      setLoadingPlan(plan.id)

      const amount =
        plan.id === "basic" ? 99 :
          plan.id === "pro" ? 149 : 0;

      const result = await axios.post(ServerUrl + "/api/payment/order", {
        planId: plan.id,
        amount: amount,
        credits: plan.credits,
      }, { withCredentials: true })


      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: result.data.amount,
        currency: "INR",
        name: "InterVue",
        description: `${plan.name} - ${plan.credits} Credits`,
        order_id: result.data.id,

        handler: async function (response) {
          const verifypay = await axios.post(ServerUrl + "/api/payment/verify", response, { withCredentials: true })
          dispatch(setUserData(verifypay.data.user))

          alert("Payment Successful 🎉 Credits Added!");
          navigate("/")

        },
        theme: {
          color: "#10b981",
        },

      }

      const rzp = new window.Razorpay(options)
      rzp.open()

      setLoadingPlan(null);
    } catch (error) {
      console.log(error)
      setLoadingPlan(null);
    }
  }



  return (
    <div className='min-h-screen bg-transparent py-16 px-6'>

      {location.state?.reason === 'low-credits' && (
        <div className='max-w-6xl mx-auto mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 shadow-sm'>
          <p className='font-semibold'>Not enough credits to start the interview.</p>
          <p className='mt-1 text-sm'>{location.state?.message || 'Choose a plan to continue your practice.'}</p>
        </div>
      )}

      <div className='mx-auto mb-14 flex max-w-6xl items-start justify-between gap-4'>
        <div className='flex items-start gap-4'>
          <button onClick={() => navigate("/")} className='mt-2 rounded-full bg-white/85 p-3 shadow transition hover:shadow-md dark:bg-slate-900/88'>
            <FaArrowLeft className='text-slate-600 dark:text-slate-200' />
          </button>

          <div className="text-center w-full">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">
            Choose Your Plan
          </h1>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-300">
            Flexible pricing to match your interview preparation goals.
          </p>
          </div>
        </div>
        <ThemeToggle />
      </div>


      <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto'>

        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id

          return (
            <motion.div key={plan.id}
              whileHover={!plan.default && { scale: 1.03 }}
              onClick={() => !plan.default && setSelectedPlan(plan.id)}

              className={`relative rounded-3xl p-8 transition-all duration-300 border 
                ${isSelected
                  ? "border-emerald-600 shadow-2xl bg-white/92 dark:bg-slate-900/92"
                  : "border-white/70 bg-white/88 shadow-md dark:border-slate-700/80 dark:bg-slate-900/88"
                }
                ${plan.default ? "cursor-default" : "cursor-pointer"}
              `}
            >

              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-6 right-6 bg-emerald-600 text-white text-xs px-4 py-1 rounded-full shadow">
                  {plan.badge}
                </div>
              )}

              {/* Default Tag */}
              {plan.default && (
                <div className="absolute top-6 right-6 rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  Default
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mt-4">
                <span className="text-3xl font-bold text-emerald-600">
                  {plan.price}
                </span>
                <p className="mt-1 text-slate-500 dark:text-slate-300">
                  {plan.credits} Credits
                </p>
              </div>

              {/* Description */}
              <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-300">
                {plan.description}
              </p>

              {/* Features */}
              <div className="mt-6 space-y-3 text-left">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <FaCheckCircle className="text-emerald-500 text-sm" />
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {!plan.default &&
                <button
                  disabled={loadingPlan === plan.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isSelected) {
                      setSelectedPlan(plan.id)
                    } else {
                      handlePayment(plan)
                    }
                  }} className={`w-full mt-8 py-3 rounded-xl font-semibold transition ${isSelected
                    ? "bg-emerald-600 text-white hover:opacity-90"
                    : "bg-slate-100 text-slate-700 hover:bg-emerald-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    }`}>
                  {loadingPlan === plan.id
                    ? "Processing..."
                    : isSelected
                      ? "Proceed to Pay"
                      : "Select Plan"}

                </button>
              }
            </motion.div>
          )
        })}
      </div>

    </div>
  )
}

export default Pricing
