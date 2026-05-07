import React from "react";
import Editor from "@monaco-editor/react";
import { FaCode, FaPlay, FaRegEye, FaRegEyeSlash, FaRotateLeft, FaTerminal } from "react-icons/fa6";
import { languageOptions, quickRunSupport } from "../utils/codeTemplates";

function CodeEditorPanel({
  language,
  code,
  runOutput,
  showOutput,
  isRunning,
  runStatus,
  onLanguageChange,
  onCodeChange,
  onRunCode,
  onToggleOutput,
  onResetTemplate,
}) {
  const currentRunSupport = quickRunSupport[language] || quickRunSupport.javascript;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,_#ffffff,_#f8fafc)] px-5 py-4 dark:border-slate-800 dark:bg-[linear-gradient(180deg,_#0f172a,_#020617)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-emerald-500 dark:text-slate-950">
              <FaCode size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Code Workspace</h3>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${currentRunSupport.available ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                  {currentRunSupport.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{currentRunSupport.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onRunCode}
              disabled={isRunning}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaPlay size={12} /> {isRunning ? "Running..." : "Quick Run"}
            </button>
            <button
              type="button"
              onClick={onResetTemplate}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <FaRotateLeft size={12} /> Reset
            </button>
            <button
              type="button"
              onClick={onToggleOutput}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {showOutput ? <FaRegEyeSlash size={12} /> : <FaRegEye size={12} />} {showOutput ? "Hide Output" : "Show Output"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {languageOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onLanguageChange(item.value)}
              className={`rounded-full border px-3 py-2 text-sm transition ${language === item.value ? "border-slate-950 bg-slate-950 font-semibold text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-slate-950" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[460px] bg-[#0b1020]">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onChange={(value) => onCodeChange(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            fontLigatures: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            padding: { top: 16 },
          }}
        />
      </div>

      {showOutput && (
        <div className="min-h-[180px] border-t border-slate-800 bg-slate-950 p-4 text-emerald-200">
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-emerald-300/80">
              <FaTerminal size={12} /> Output
            </div>
            <span className="text-xs text-white/45">
              {runStatus === "success" && "Run finished successfully"}
              {runStatus === "error" && "Run returned an error"}
              {runStatus === "timeout" && "Run timed out"}
              {runStatus === "unavailable" && "Quick run unavailable"}
              {(!runStatus || runStatus === "idle") && (currentRunSupport.available ? "Local quick run enabled" : "AI review only for this language")}
            </span>
          </div>
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6">
            {runOutput || "Run your code to see output here."}
          </pre>
        </div>
      )}
    </div>
  );
}

export default CodeEditorPanel;
