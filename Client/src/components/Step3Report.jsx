import React from 'react'
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { motion } from "motion/react"
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import ThemeToggle from './ThemeToggle'

function Step3Report({ report }) {
  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading Report...</p>
      </div>
    );
  }
  const navigate = useNavigate()
  const {
    finalScore = 0,
    confidence = 0,
    communication = 0,
    correctness = 0,
    questionWiseScore = [],
    proctoring = {},
  } = report;
  const proctoringSummary = proctoring.summary || {};
  const proctoringWarnings = proctoring.warnings || [];

  const questionScoreData = questionWiseScore.map((score, index) => ({
    name: `Q${index + 1}`,
    score: score.score || 0
  }))

  const skills = [
    { label: "Confidence", value: confidence },
    { label: "Communication", value: communication },
    { label: "Correctness", value: correctness },
  ];

  let performanceText = "";
  let shortTagline = "";

  if (finalScore >= 8) {
    performanceText = "Ready for job opportunities.";
    shortTagline = "Excellent clarity and structured responses.";
  } else if (finalScore >= 5) {
    performanceText = "Needs minor improvement before interviews.";
    shortTagline = "Good foundation, refine articulation.";
  } else {
    performanceText = "Significant improvement required.";
    shortTagline = "Work on clarity and confidence.";
  }

  const score = finalScore;
  const percentage = (score / 10) * 100;


  const downloadPDF = () => {
  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  let currentY = 25;

  // ================= TITLE =================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(34, 197, 94);
  doc.text("InterVue Performance Report", pageWidth / 2, currentY, {
    align: "center",
  });

  currentY += 5;

  // underline
  doc.setDrawColor(34, 197, 94);
  doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

  currentY += 15;

  // ================= FINAL SCORE BOX =================
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, currentY, contentWidth, 20, 4, 4, "F");

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Final Score: ${finalScore}/10`,
    pageWidth / 2,
    currentY + 12,
    { align: "center" }
  );

  currentY += 30;

  // ================= SKILLS BOX =================
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, currentY, contentWidth, 30, 4, 4, "F");

  doc.setFontSize(12);

  doc.text(`Confidence: ${confidence}`, margin + 10, currentY + 10);
  doc.text(`Communication: ${communication}`, margin + 10, currentY + 18);
  doc.text(`Correctness: ${correctness}`, margin + 10, currentY + 26);

  currentY += 45;

  // ================= ADVICE =================
  let advice = "";

  if (finalScore >= 8) {
    advice =
      "Excellent performance. Maintain confidence and structure. Continue refining clarity and supporting answers with strong real-world examples.";
  } else if (finalScore >= 5) {
    advice =
      "Good foundation shown. Improve clarity and structure. Practice delivering concise, confident answers with stronger supporting examples.";
  } else {
    advice =
      "Significant improvement required. Focus on structured thinking, clarity, and confident delivery. Practice answering aloud regularly.";
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220);
  doc.roundedRect(margin, currentY, contentWidth, 35, 4, 4);

  doc.setFont("helvetica", "bold");
  doc.text("Professional Advice", margin + 10, currentY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const splitAdvice = doc.splitTextToSize(advice, contentWidth - 20);
  doc.text(splitAdvice, margin + 10, currentY + 20);

  currentY += 50;

  // ================= QUESTION TABLE =================
  autoTable(doc, {
  startY: currentY,
  margin: { left: margin, right: margin },
  head: [["#", "Question", "Score", "Feedback"]],
  body: questionWiseScore.map((q, i) => [
    `${i + 1}`,
    q.question,
    `${q.score}/10`,
    q.feedback,
  ]),
  styles: {
    fontSize: 9,
    cellPadding: 5,
    valign: "top",
  },
  headStyles: {
    fillColor: [34, 197, 94],
    textColor: 255,
    halign: "center",
  },
  columnStyles: {
    0: { cellWidth: 10, halign: "center" }, // index
    1: { cellWidth: 55 }, // question
    2: { cellWidth: 20, halign: "center" }, // score
    3: { cellWidth: "auto" }, // feedback
  },
  alternateRowStyles: {
    fillColor: [249, 250, 251],
  },
});


  doc.save("AI_Interview_Report.pdf");
};

  return (
    <div className='min-h-screen bg-transparent px-4 py-8 sm:px-6 lg:px-10'>
      <div className='mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='md:mb-10 w-full flex items-start gap-4 flex-wrap'>
          <button
            onClick={() => navigate("/history")}
            className='mt-1 rounded-full bg-white/88 p-3 shadow transition hover:shadow-md dark:bg-slate-900/88'><FaArrowLeft className='text-slate-600 dark:text-slate-200' /></button>

          <div>
            <h1 className='text-3xl font-bold flex-nowrap text-slate-900 dark:text-slate-50'>
              Interview Analytics Dashboard
            </h1>
            <p className='mt-2 text-slate-500 dark:text-slate-300'>
              AI-powered performance insights
            </p>

          </div>
        </div>

        <div className='flex items-center gap-3 self-end sm:self-auto'>
          <ThemeToggle />
          <button
            onClick={() => navigate("/")}
            className='rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:text-base'
          >
            Exit
          </button>
          <button onClick={downloadPDF} className='bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl shadow-md transition-all duration-300 font-semibold text-sm sm:text-base text-nowrap'>Download PDF</button>
        </div>
      </div>


      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8'>

        <div className='space-y-6'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-white/88 p-6 text-center shadow-lg dark:bg-slate-900/88 sm:rounded-3xl sm:p-8">

            <h3 className="mb-4 text-sm text-slate-500 dark:text-slate-300 sm:mb-6 sm:text-base">
              Overall Performance
            </h3>
            <div className='relative w-20 h-20 sm:w-25 sm:h-25 mx-auto'>
              <CircularProgressbar
                value={percentage}
                text={`${score}/10`}
                styles={buildStyles({
                  textSize: "18px",
                  pathColor: "#10b981",
                  textColor: "#ef4444",
                  trailColor: "#e5e7eb",
                })}
              />
            </div>

            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 sm:text-sm">
              Out of 10
            </p>

            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-50 sm:text-base">
                {performanceText}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300 sm:text-sm">
                {shortTagline}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8'>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-6">
              Skill Evaluation
            </h3>

            <div className='space-y-5'>
              {
                skills.map((s, i) => (
                  <div key={i}>
                    <div className='flex justify-between mb-2 text-sm sm:text-base'>

                      <span>{s.label}</span>
                      <span className='font-semibold text-green-600'>{s.value}</span>
                    </div>

                    <div className='bg-gray-200 h-2 sm:h-3 rounded-full'>
                      <div className='bg-green-500 h-full rounded-full'
                        style={{ width: `${s.value * 10}%` }}

                      ></div>

                    </div>


                  </div>
                ))
              }
            </div>

          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8'>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-6">
              Proctoring Summary
            </h3>

            <div className='space-y-4'>
              <div className='flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3'>
                <span className='text-sm text-gray-500'>Risk score</span>
                <span className='text-lg font-semibold text-gray-800'>{proctoringSummary.riskScore || 0}/100</span>
              </div>
              <div className='flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3'>
                <span className='text-sm text-gray-500'>Warnings logged</span>
                <span className='text-lg font-semibold text-gray-800'>{proctoringSummary.warningCount || 0}</span>
              </div>
              <div className='flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3'>
                <span className='text-sm text-gray-500'>Active at finish</span>
                <span className='text-lg font-semibold text-gray-800'>{proctoringSummary.activeCount || 0}</span>
              </div>
            </div>

            <p className='mt-4 text-xs leading-relaxed text-gray-500'>
              Proctoring warnings are signals for review, not a final cheating verdict.
            </p>
          </motion.div>


        </div>

        <div className='lg:col-span-2 space-y-6'>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8'>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 sm:mb-6">
              Performance Trend
            </h3>

            <div className='h-64 sm:h-72'>

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={questionScoreData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Area type="monotone"
                    dataKey="score"
                    stroke="#22c55e"
                    fill="#bbf7d0"
                    strokeWidth={3} />


                </AreaChart>

              </ResponsiveContainer>


            </div>


          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8'>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-6">
              Question Breakdown
            </h3>
            <div className='space-y-6'>
              {questionWiseScore.map((q, i) => (
                <div key={i} className='bg-gray-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200'>

                  <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4'>
                    <div>
                      <p className="text-xs text-gray-400">
                        Question {i + 1}
                      </p>

                      <p className="font-semibold text-gray-800 text-sm sm:text-base leading-relaxed">
                        {q.question || "Question not available"}
                      </p>
                    </div>


                    <div className='bg-green-100 text-green-600 px-3 py-1 rounded-full font-bold text-xs sm:text-sm w-fit'>
                      {q.score ?? 0}/10
                    </div>
                  </div>

                  <div className='bg-green-50 border border-green-200 p-4 rounded-lg'>
                    <p className='text-xs text-green-600 font-semibold mb-1'>
                      AI Feedback
                    </p>
                    <p className='text-sm text-gray-700 leading-relaxed'>

                      {q.feedback && q.feedback.trim() !== ""
                        ? q.feedback
                        : "No feedback available for this question."}
                    </p>
                  </div>

                </div>
              ))}
            </div>

          </motion.div>

          {proctoringWarnings.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8'>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-6">
                Proctoring Events
              </h3>
              <div className='space-y-4'>
                {proctoringWarnings.map((warning, index) => (
                  <div key={warning.eventId || index} className='rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4'>
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                      <div>
                        <p className='text-sm font-semibold text-gray-800'>{warning.label || warning.type}</p>
                        <p className='mt-1 text-sm text-gray-600'>{warning.message || "Monitoring event recorded."}</p>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-semibold w-fit ${warning.severity === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {warning.severity || "medium"}
                      </div>
                    </div>
                    <div className='mt-3 flex flex-wrap gap-2 text-xs text-gray-500'>
                      <span className='rounded-full bg-white px-3 py-1'>Status: {warning.status || "resolved"}</span>
                      <span className='rounded-full bg-white px-3 py-1'>Duration: {Math.round((warning.durationMs || 0) / 1000)}s</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}





        </div>
      </div>

    </div>
  )
}

export default Step3Report
