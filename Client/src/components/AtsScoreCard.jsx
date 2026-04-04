import React from "react";

const getScoreLabel = (score) => {
  if (score >= 85) return { text: "Strong Match", color: "text-green-700 bg-green-100" };
  if (score >= 70) return { text: "Good Match", color: "text-emerald-700 bg-emerald-100" };
  if (score >= 50) return { text: "Moderate Match", color: "text-amber-700 bg-amber-100" };
  return { text: "Needs Improvement", color: "text-red-700 bg-red-100" };
};

function AtsScoreCard({ report }) {
  if (!report) return null;

  const badge = getScoreLabel(report.overallScore);
  const categories = [
    { label: "Keywords", value: report.keywordScore },
    { label: "Skills", value: report.skillsScore },
    { label: "Experience", value: report.experienceScore },
    { label: "Projects", value: report.projectsScore },
    { label: "Format", value: report.formatScore },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">ATS Resume Match</h3>
          <p className="text-sm text-gray-500">Check how well your resume matches the target role before starting the interview.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold text-gray-900">{report.overallScore}<span className="text-lg text-gray-500">/100</span></div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>{badge.text}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-3">
        {categories.map((item) => (
          <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className="text-xl font-semibold text-gray-800 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-4">
          <p className="font-medium text-gray-800 mb-2">Matched Keywords</p>
          <div className="flex flex-wrap gap-2">
            {report.matchedKeywords?.length ? report.matchedKeywords.map((item, index) => (
              <span key={`${item}-${index}`} className="bg-white text-green-700 border border-green-200 px-3 py-1 rounded-full text-sm">{item}</span>
            )) : <p className="text-sm text-gray-500">No strong keyword matches found yet.</p>}
          </div>
        </div>

        <div className="bg-red-50 rounded-xl p-4">
          <p className="font-medium text-gray-800 mb-2">Missing Keywords</p>
          <div className="flex flex-wrap gap-2">
            {report.missingKeywords?.length ? report.missingKeywords.map((item, index) => (
              <span key={`${item}-${index}`} className="bg-white text-red-700 border border-red-200 px-3 py-1 rounded-full text-sm">{item}</span>
            )) : <p className="text-sm text-gray-500">No major missing keywords.</p>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="font-medium text-gray-800 mb-2">Strengths</p>
          <ul className="space-y-2 text-sm text-gray-600">
            {(report.strengths || []).map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
          </ul>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="font-medium text-gray-800 mb-2">Weaknesses</p>
          <ul className="space-y-2 text-sm text-gray-600">
            {(report.weaknesses || []).map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
          </ul>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="font-medium text-gray-800 mb-2">Suggestions</p>
          <ul className="space-y-2 text-sm text-gray-600">
            {(report.suggestions || []).map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AtsScoreCard;
