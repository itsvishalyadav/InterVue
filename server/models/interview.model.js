import mongoose from "mongoose";

const questionsSchema = new mongoose.Schema({
  question: String,
  difficulty: String,
  timeLimit: Number,
  minimumSubmissionTime: { type: Number, default: 0 },
  requiresCode: { type: Boolean, default: false },
  questionType: { type: String, default: "discussion" },
  category: { type: String, default: "general" },
  starterCode: { type: String, default: "" },
  companyTag: { type: String, default: "" },
  yearTag: { type: String, default: "" },
  roundTag: { type: String, default: "" },
  answer: String,
  explanation: { type: String, default: "" },
  code: { type: String, default: "" },
  language: { type: String, default: "javascript" },
  submittedAtSeconds: { type: Number, default: 0 },
  submittedTooEarly: { type: Boolean, default: false },
  timingFlag: { type: String, default: "" },
  feedback: String,
  score: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
  communication: { type: Number, default: 0 },
  correctness: { type: Number, default: 0 },
})

const proctoringWarningSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  type: { type: String, required: true },
  label: { type: String, default: "" },
  message: { type: String, default: "" },
  severity: { type: String, enum: ["medium", "high"], default: "medium" },
  status: { type: String, enum: ["active", "resolved"], default: "active" },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  durationMs: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false })

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  role: {
    type: String,
    required: true
  },
  experience: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ["HR", "Technical"],
    required: true
  },
  resumeText: {
    type: String
  },
  questions: [questionsSchema],
  proctoring: {
    warnings: {
      type: [proctoringWarningSchema],
      default: [],
    },
    summary: {
      warningCount: { type: Number, default: 0 },
      activeCount: { type: Number, default: 0 },
      riskScore: { type: Number, default: 0 },
      lastEventAt: { type: Date, default: null },
    },
  },
  finalScore: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["Incompleted", "completed"],
    default: "Incompleted",
  }
}, { timestamps: true })

const Interview = mongoose.model("Interview", interviewSchema)

export default Interview
