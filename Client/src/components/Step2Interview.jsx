import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import maleVideo from "../assets/videos/male-ai.mp4";
import femaleVideo from "../assets/videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "motion/react";
import axios from "axios";
import { ServerUrl } from "../App";
import { BsArrowRight } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import {
  FaCode,
  FaMicrophone,
  FaMicrophoneSlash,
  FaRegEye,
  FaRegEyeSlash,
  FaRegLightbulb,
  FaTriangleExclamation,
  FaUserShield,
  FaVideo,
} from "react-icons/fa6";
import CodeEditorPanel from "./CodeEditorPanel";
import { getStarterCodeForQuestion, inferPreferredLanguage } from "../utils/codeTemplates";
import {
  buildWarningMessage,
  estimateAttention,
  getAlertAppearance,
  PROCTORING_ALERTS,
} from "../utils/proctoring";

const DEFAULT_PROCTORING_SUMMARY = {
  warningCount: 0,
  activeCount: 0,
  riskScore: 0,
  lastEventAt: null,
};

const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getQuestionStarterCode = (question, language = "javascript") => {
  return getStarterCodeForQuestion(question, language);
};

const createTechnicalState = (question) => ({
  answer: "",
  language: inferPreferredLanguage(question),
  code: getQuestionStarterCode(question, inferPreferredLanguage(question)),
  output: "",
  runStatus: "idle",
  isRunning: false,
  showOutput: true,
  languageDrafts: {
    javascript: getQuestionStarterCode(question, "javascript"),
    python: getQuestionStarterCode(question, "python"),
    java: getQuestionStarterCode(question, "java"),
    cpp: getQuestionStarterCode(question, "cpp"),
  },
});

const getCompanyTagTone = (company = "") => {
  const tones = {
    Google: "border-blue-200 bg-blue-50 text-blue-700",
    Meta: "border-sky-200 bg-sky-50 text-sky-700",
    Amazon: "border-orange-200 bg-orange-50 text-orange-700",
    Microsoft: "border-cyan-200 bg-cyan-50 text-cyan-700",
    Netflix: "border-rose-200 bg-rose-50 text-rose-700",
    Apple: "border-slate-200 bg-slate-100 text-slate-700",
  };
  return tones[company] || "border-slate-200 bg-slate-50 text-slate-700";
};

const ProctoringAlertStack = ({ alerts }) => {
  if (!alerts.length) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {alerts.map((alert) => {
        const appearance = getAlertAppearance(alert.severity);
        return (
          <div key={alert.id} className={`rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${appearance.panel}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-1 h-2.5 w-2.5 rounded-full ${appearance.dot}`} />
              <div>
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="mt-1 text-sm opacity-90">{alert.message}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function Step2Interview({ interviewData, onFinish }) {
  const { interviewId, questions, userName, mode = "Technical", voicePreference = "female" } = interviewData;
  const navigate = useNavigate();
  const isTechnicalMode = mode === "Technical";

  const [isIntroPhase, setIsIntroPhase] = useState(true);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const recognitionActiveRef = useRef(false);
  const isMicOnRef = useRef(false);
  const isAIPlayingRef = useRef(false);
  
  const lastTranscriptChunkRef = useRef("");
  const lastTranscriptAtRef = useRef(0);
  
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit || 60);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceGender, setVoiceGender] = useState(voicePreference);
  const [subtitle, setSubtitle] = useState("");
  const [feedback, setFeedback] = useState("");
  
  const videoRef = useRef(null);
  const [showEditor, setShowEditor] = useState(() => isTechnicalMode ? Boolean(questions[0]?.requiresCode) : false);

  const candidateVideoRef = useRef(null);
  const workspaceBoundsRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const detectorRef = useRef(null);
  const detectorModeRef = useRef("loading");
  const detectionIntervalRef = useRef(null);
  const detectionBusyRef = useRef(false);
  const warningStateRef = useRef({});
  const alertTimeoutsRef = useRef([]);

  const [cameraPermission, setCameraPermission] = useState("prompt");
  const [micPermission, setMicPermission] = useState("prompt");
  const [detectorStatus, setDetectorStatus] = useState("loading");
  const [detectorMode, setDetectorMode] = useState("loading");
  const [cameraStatusText, setCameraStatusText] = useState("Starting camera checks...");
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [activeWarningTypes, setActiveWarningTypes] = useState([]);
  const [proctoringSummary, setProctoringSummary] = useState(DEFAULT_PROCTORING_SUMMARY);

  const [questionStates, setQuestionStates] = useState(
    questions.map((question) => (isTechnicalMode ? createTechnicalState(question) : { answer: "" }))
  );

  const currentQuestion = questions[currentIndex];
  const currentState = useMemo(() => {
    if (!questionStates[currentIndex]) {
      return isTechnicalMode ? createTechnicalState() : { answer: "" };
    }
    return questionStates[currentIndex];
  }, [questionStates, currentIndex, isTechnicalMode]);
  const suggestedMinutes = Math.max(1, Math.round((currentQuestion?.timeLimit || 60) / 60));
  const interviewStyleTags = useMemo(() => {
    if (!currentQuestion?.companyTag || !currentQuestion?.yearTag || !currentQuestion?.roundTag) return [];
    return [{
      label: `${currentQuestion.companyTag} ${currentQuestion.yearTag} ${currentQuestion.roundTag}`,
      className: getCompanyTagTone(currentQuestion.companyTag),
    }];
  }, [currentQuestion]);
  const feedbackTone = useMemo(() => {
    const text = (feedback || "").toLowerCase();
    if (!text) return "neutral";
    const negativeHints = ["no attempt", "incorrect", "failed", "needs improvement", "missing", "not enough", "did not", "weak"];
    const positiveHints = ["strong", "good", "great", "excellent", "well done", "correct", "solid", "nice work"];
    if (negativeHints.some((h) => text.includes(h))) return "negative";
    if (positiveHints.some((h) => text.includes(h))) return "positive";
    return "neutral";
  }, [feedback]);

  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);

  useEffect(() => {
    isAIPlayingRef.current = isAIPlaying;
  }, [isAIPlaying]);

  useEffect(() => {
    lastTranscriptChunkRef.current = "";
    lastTranscriptAtRef.current = 0;
  }, [currentIndex]);

  const updateCurrentState = (updater) => {
    setQuestionStates((prev) =>
      prev.map((item, index) => {
        if (index !== currentIndex) return item;
        const updates = typeof updater === "function" ? updater(item) : updater;
        return { ...item, ...updates };
      })
    );
  };

  const syncActiveWarningTypes = () => {
    const nextTypes = Object.entries(warningStateRef.current)
      .filter(([, item]) => item?.status === "active")
      .map(([type]) => type);
    setActiveWarningTypes(nextTypes);
  };

  const showLiveAlert = (type, override = {}) => {
    const config = PROCTORING_ALERTS[type] || {};
    const alertId = createId();
    const nextAlert = {
      id: alertId,
      title: override.label || config.label || "Alert",
      message: override.message || config.description || "Suspicious activity detected.",
      severity: override.severity || config.severity || "medium",
    };
    setLiveAlerts((prev) => [nextAlert, ...prev].slice(0, 4));
    const timeoutId = window.setTimeout(() => {
      setLiveAlerts((prev) => prev.filter((item) => item.id !== alertId));
    }, 5200);
    alertTimeoutsRef.current.push(timeoutId);
  };

  const postProctoringEvent = async (payload) => {
    try {
      const result = await axios.post(
        `${ServerUrl}/api/interview/proctoring-event`,
        { interviewId, ...payload },
        { withCredentials: true }
      );
      if (result.data) {
        setProctoringSummary((prev) => ({ ...prev, ...result.data }));
      }
    } catch (error) {
      console.log("failed to sync proctoring event", error);
    }
  };

  const openWarning = (type, extra = {}) => {
    const config = PROCTORING_ALERTS[type];
    if (!config) return;
    const existing = warningStateRef.current[type];
    if (existing?.status === "active") return;

    const startedAt = new Date().toISOString();
    const eventId = existing?.eventId || createId();
    const message = buildWarningMessage(type, extra);

    warningStateRef.current[type] = {
      eventId, status: "active", startedAt, openedAtMs: Date.now(), meta: extra,
    };
    syncActiveWarningTypes();
    showLiveAlert(type, { message, severity: config.severity, label: config.label });
    postProctoringEvent({
      eventId, type, label: config.label, message, severity: config.severity,
      status: "active", startedAt, confidence: extra.confidence || 0, meta: extra,
    });
  };

  const resolveWarning = async (type, extra = {}) => {
    const warning = warningStateRef.current[type];
    if (!warning || warning.status !== "active") {
      if (warning) warningStateRef.current[type] = { ...warning, pendingSince: null };
      return;
    }
    const endedAt = new Date().toISOString();
    const durationMs = Math.max(0, Date.now() - (warning.openedAtMs || Date.now()));
    const config = PROCTORING_ALERTS[type];
    const message = buildWarningMessage(type, { ...warning.meta, ...extra });

    warningStateRef.current[type] = { ...warning, status: "resolved", pendingSince: null };
    syncActiveWarningTypes();
    await postProctoringEvent({
      eventId: warning.eventId, type, label: config?.label || type, message,
      severity: config?.severity || "medium", status: "resolved",
      startedAt: warning.startedAt, endedAt, durationMs,
      confidence: extra.confidence || warning.meta?.confidence || 0,
      meta: { ...warning.meta, ...extra },
    });
  };

  const evaluateWarning = (type, triggered, extra = {}) => {
    const config = PROCTORING_ALERTS[type];
    if (!config) return;
    const existing = warningStateRef.current[type];

    if (triggered) {
      const pendingSince = existing?.pendingSince || Date.now();
      warningStateRef.current[type] = {
        ...existing, eventId: existing?.eventId || createId(), pendingSince, meta: extra,
      };
      if (Date.now() - pendingSince >= config.activationMs) {
        openWarning(type, extra);
      }
      return;
    }
    if (existing?.status === "active") { resolveWarning(type, extra); return; }
    if (existing) {
      warningStateRef.current[type] = { ...existing, pendingSince: null, meta: extra };
    }
  };

  const flushActiveWarnings = async () => {
    const activeTypes = Object.entries(warningStateRef.current)
      .filter(([, item]) => item?.status === "active")
      .map(([type]) => type);
    await Promise.all(activeTypes.map((type) => resolveWarning(type)));
  };

  useEffect(() => {
    let cancelled = false;
    const initializeDetector = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
        const detector = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO", numFaces: 3,
          minFaceDetectionConfidence: 0.55, minFacePresenceConfidence: 0.55, minTrackingConfidence: 0.5,
        });
        if (cancelled) { detector.close(); return; }
        detectorRef.current = detector;
        detectorModeRef.current = "mediapipe";
        setDetectorMode("mediapipe");
        setDetectorStatus("ready");
      } catch (error) {
        console.log("mediapipe detector unavailable", error);
        if ("FaceDetector" in window) {
          detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
          detectorModeRef.current = "native";
          setDetectorMode("native");
          setDetectorStatus("limited");
          showLiveAlert("detector_offline");
          return;
        }
        detectorRef.current = null;
        detectorModeRef.current = "offline";
        setDetectorMode("offline");
        setDetectorStatus("offline");
        showLiveAlert("detector_offline");
      }
    };
    initializeDetector();
    return () => { cancelled = true; detectorRef.current?.close?.(); detectorRef.current = null; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initializeCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraPermission("blocked");
        setCameraStatusText("Camera access is not available in this browser.");
        openWarning("camera_blocked", { confidence: 1 });
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 360 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        cameraStreamRef.current = stream;
        if (candidateVideoRef.current) {
          candidateVideoRef.current.srcObject = stream;
          candidateVideoRef.current.play().catch(() => { });
        }
        setCameraPermission("granted");
        setCameraStatusText("Camera live. Monitoring face visibility and attention.");
      } catch (error) {
        console.log("camera permission denied", error);
        setCameraPermission("blocked");
        setCameraStatusText("Camera permission is blocked. Real-time proctoring is limited.");
        openWarning("camera_blocked", { confidence: 1 });
      }
    };
    initializeCamera();
    return () => {
      cancelled = true;
      cameraStreamRef.current?.getTracks()?.forEach((track) => track.stop());
      cameraStreamRef.current = null;
      micStreamRef.current?.getTracks()?.forEach((track) => track.stop());
      micStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const preferredGender = voicePreference === "male" ? "male" : "female";

    const matchesGender = (voice, gender) => {
      const name = voice.name.toLowerCase();
      if (gender === "male") {
        return name.includes("david") || name.includes("mark") || name.includes("male");
      }
      return name.includes("zira") || name.includes("samantha") || name.includes("female");
    };

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      const preferredVoice = voices.find((voice) => matchesGender(voice, preferredGender));
      const fallbackVoice = voices.find((voice) => matchesGender(voice, preferredGender === "male" ? "female" : "male"));
      const nextVoice = preferredVoice || fallbackVoice || voices[0];

      setSelectedVoice(nextVoice);
      setVoiceGender(preferredVoice ? preferredGender : preferredGender === "male" ? "female" : "male");
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [voicePreference]);

  const ensureMicrophoneAccess = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setSpeechSupported(false);
      return false;
    }

    if (micStreamRef.current) {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      micStreamRef.current = stream;
      setMicPermission("granted");
      return true;
    } catch (error) {
      console.log("microphone permission denied", error);
      setMicPermission(error?.name === "NotFoundError" ? "unavailable" : "blocked");
      shouldKeepListeningRef.current = false;
      setIsMicOn(false);
      return false;
    }
  };

  const startMic = async () => {
    shouldKeepListeningRef.current = true;

    if (!speechSupported) return;

    const hasMicrophone = await ensureMicrophoneAccess();
    if (!hasMicrophone) return;

    if (recognitionRef.current && !isAIPlayingRef.current && !recognitionActiveRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        return;
      }
    }
  };

  const stopMic = () => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    recognitionActiveRef.current = false;
    setIsListening(false);
  };

  const speakText = (text) =>
    new Promise((resolve) => {
      if (!window.speechSynthesis || !selectedVoice) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const humanText = text.replace(/,/g, ", ... ").replace(/\./g, ". ... ");
      const utterance = new SpeechSynthesisUtterance(humanText);
      utterance.voice = selectedVoice;
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsAIPlaying(true);
        isAIPlayingRef.current = true;
        stopMic();
        videoRef.current?.play();
      };

      utterance.onend = () => {
        videoRef.current?.pause();
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
        }
        setIsAIPlaying(false);
        isAIPlayingRef.current = false;
        if (isMicOnRef.current) {
          shouldKeepListeningRef.current = true;
          void startMic();
        }
        setTimeout(() => {
          setSubtitle("");
          resolve();
        }, 300);
      };

      setSubtitle(text);
      window.speechSynthesis.speak(utterance);
    });

  useEffect(() => {
    if (!selectedVoice) return;

    const runIntro = async () => {
      if (isIntroPhase) {
        await speakText(`Hi ${userName}, it is great to meet you today. I hope you are feeling confident and ready.`);
        await speakText(
          isTechnicalMode
            ? "For technical questions, you can explain your thinking, write code, and run quick checks in the workspace. Let us begin."
            : "I will ask you a few questions. Just answer naturally, and take your time. Let us begin."
        );
        setIsIntroPhase(false);
      } else if (currentQuestion) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (currentIndex === questions.length - 1) {
          await speakText("Alright, this one might be a bit more challenging.");
        }
        await speakText(currentQuestion.question);
        if (isMicOnRef.current) {
          shouldKeepListeningRef.current = true;
          void startMic();
        }
      }
    };

    runIntro();
  }, [selectedVoice, isIntroPhase, currentIndex]);

  useEffect(() => {
    if (isIntroPhase || !currentQuestion) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isIntroPhase, currentIndex, currentQuestion]);

  useEffect(() => {
    if (!isIntroPhase && currentQuestion) {
      setTimeLeft(currentQuestion.timeLimit || 60);
    }
  }, [currentIndex, isIntroPhase, currentQuestion]);

  useEffect(() => {
    if (!isTechnicalMode || !currentQuestion) return;
    setShowEditor(Boolean(currentQuestion.requiresCode));
  }, [currentIndex, currentQuestion, isTechnicalMode]);

  useEffect(() => {
    const SpeechRecognitionApi = window.webkitSpeechRecognition || window.SpeechRecognition;

    if (!SpeechRecognitionApi) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      recognitionActiveRef.current = true;
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const finalChunks = [];

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result?.isFinal) continue;

        const transcript = result[0]?.transcript?.replace(/\s+/g, " ").trim();
        if (transcript) finalChunks.push(transcript);
      }

      if (!finalChunks.length) return;

      updateCurrentState((state) => {
        let nextAnswer = (state.answer || "").trim();

        finalChunks.forEach((chunk) => {
          const normalizedChunk = chunk.toLowerCase();
          const normalizedAnswer = nextAnswer.toLowerCase();
          const repeatedRecently =
            normalizedChunk === lastTranscriptChunkRef.current &&
            Date.now() - lastTranscriptAtRef.current < 4000;
          const alreadyAtTail = normalizedAnswer.endsWith(normalizedChunk);

          if (repeatedRecently || alreadyAtTail) return;

          nextAnswer = nextAnswer ? `${nextAnswer} ${chunk}` : chunk;
          lastTranscriptChunkRef.current = normalizedChunk;
          lastTranscriptAtRef.current = Date.now();
        });

        return { answer: nextAnswer };
      });
    };

    recognition.onerror = (event) => {
      console.log("speech recognition error", event?.error);
      recognitionActiveRef.current = false;
      setIsListening(false);

      if (event?.error === "not-allowed" || event?.error === "service-not-allowed" || event?.error === "audio-capture") {
        shouldKeepListeningRef.current = false;
        setIsMicOn(false);
      } else if (event?.error === "no-speech") {
        return;
      } else if (event?.error === "network") {
        return;
      }
    };

    recognition.onend = () => {
      recognitionActiveRef.current = false;
      setIsListening(false);

      if (shouldKeepListeningRef.current && !isAIPlayingRef.current) {
        window.setTimeout(() => {
          if (shouldKeepListeningRef.current && recognitionRef.current && !recognitionActiveRef.current) {
            try {
              recognitionRef.current.start();
            } catch {
              return;
            }
          }
        }, 250);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
      recognitionActiveRef.current = false;
      setIsListening(false);
    };
  }, [currentIndex]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const hidden = document.visibilityState === "hidden";
      evaluateWarning("tab_hidden", hidden, {
        confidence: 1,
        visibilityState: document.visibilityState,
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (cameraPermission !== "granted" || !candidateVideoRef.current) return;

    const runDetection = async () => {
      if (detectionBusyRef.current || document.visibilityState === "hidden") return;

      const detector = detectorRef.current;
      const mode = detectorModeRef.current;
      const candidateVideo = candidateVideoRef.current;

      if (!candidateVideo || candidateVideo.readyState < 2 || !detector || mode === "offline") return;

      detectionBusyRef.current = true;

      try {
        let faceCount = 0;
        let attention = { isLookingAway: false, yaw: 0, pitch: 0 };

        if (mode === "mediapipe") {
          const result = detector.detectForVideo(candidateVideo, performance.now());
          const landmarks = result?.faceLandmarks || [];
          faceCount = landmarks.length;
          if (faceCount === 1) {
            attention = estimateAttention(landmarks[0]);
          }
        } else if (mode === "native") {
          const result = await detector.detect(candidateVideo);
          faceCount = result.length;
        }

        evaluateWarning("no_face", faceCount === 0, { confidence: faceCount === 0 ? 1 : 0, faceCount });
        evaluateWarning("multiple_faces", faceCount > 1, { confidence: Math.min(1, faceCount / 3), faceCount });

        if (mode === "mediapipe" && faceCount === 1) {
          evaluateWarning("looking_away", attention.isLookingAway, {
            confidence: Number(Math.max(attention.yaw, attention.pitch).toFixed(2)),
            faceCount, yaw: Number(attention.yaw.toFixed(3)), pitch: Number(attention.pitch.toFixed(3)),
          });
        } else {
          evaluateWarning("looking_away", false);
        }

        if (faceCount === 0) setCameraStatusText("Face not visible. Move back into the frame.");
        else if (faceCount > 1) setCameraStatusText("Multiple faces detected. Only one candidate should be visible.");
        else if (mode === "mediapipe" && attention.isLookingAway) setCameraStatusText("Looking away detected. Please focus on the interview screen.");
        else if (mode === "native") setCameraStatusText("Camera live. Face-count checks are running.");
        else setCameraStatusText("Camera live. Face and attention checks are active.");
      } catch (error) {
        console.log("face detection error", error);
        setCameraStatusText("Face checks paused. Tab monitoring is still active.");
      } finally {
        detectionBusyRef.current = false;
      }
    };

    detectionIntervalRef.current = window.setInterval(runDetection, 700);
    return () => {
      window.clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    };
  }, [cameraPermission]);

  const toggleMic = () => {
    if (isMicOn) {
      stopMic();
      setIsMicOn(false);
    } else {
      setIsMicOn(true);
      shouldKeepListeningRef.current = true;
      void startMic();
    }
  };

  const handleLanguageChange = (language) => {
    updateCurrentState((state) => ({
      language,
      code: state.languageDrafts?.[language] || getQuestionStarterCode(currentQuestion, language),
      output: "",
      runStatus: "idle",
    }));
  };

  const handleCodeChange = (code) => {
    updateCurrentState((state) => ({
      code,
      runStatus: state.code === code ? state.runStatus : "idle",
      languageDrafts: {
        ...(state.languageDrafts || {}),
        [state.language]: code,
      },
    }));
  };

  const handleResetTemplate = () => {
    updateCurrentState((state) => {
      const nextTemplate = getQuestionStarterCode(currentQuestion, state.language);
      return {
        code: nextTemplate, output: "", runStatus: "idle",
        languageDrafts: { ...(state.languageDrafts || {}), [state.language]: nextTemplate },
      };
    });
  };

  const runCode = async () => {
    if (!isTechnicalMode) return;
    updateCurrentState({ isRunning: true, showOutput: true, output: "Running your latest code..." });

    try {
      const result = await axios.post(
        `${ServerUrl}/api/interview/quick-run`,
        { language: currentState.language, code: currentState.code },
        { withCredentials: true }
      );
      updateCurrentState({
        isRunning: false,
        output: result.data.output || "Program finished with no output.",
        showOutput: true,
        runStatus: result.data.status || (result.data.ok ? "success" : "error"),
      });
    } catch (error) {
      updateCurrentState({
        isRunning: false,
        output: error?.response?.data?.message || "Quick run failed. Please try again.",
        showOutput: true,
        runStatus: "error",
      });
    }
  };

  const submitAnswer = async () => {
    if (isSubmitting) return;
    stopMic();
    setIsSubmitting(true);

    try {
      const result = await axios.post(
        ServerUrl + "/api/interview/submit-answer",
        {
          interviewId,
          questionIndex: currentIndex,
          answer: currentState.answer || "",
          explanation: currentState.answer || "",
          code: isTechnicalMode ? currentState.code || "" : "",
          language: isTechnicalMode ? currentState.language || "javascript" : "javascript",
          timeTaken: currentQuestion.timeLimit - timeLeft,
        },
        { withCredentials: true }
      );

      setFeedback(result.data.feedback);
      speakText(result.data.feedback);
    } catch (error) {
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishInterview = async () => {
    stopMic();
    setIsMicOn(false);
    await flushActiveWarnings();

    try {
      const result = await axios.post(ServerUrl + "/api/interview/finish", { interviewId }, { withCredentials: true });
      onFinish(result.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleQuitInterview = async () => {
    const shouldQuit = window.confirm("Quit this interview and return home?");
    if (!shouldQuit) return;

    stopMic();
    setIsMicOn(false);
    await flushActiveWarnings();
    window.speechSynthesis.cancel();
    navigate("/");
  };

  const handleNext = async () => {
    setFeedback("");
    if (currentIndex + 1 >= questions.length) {
      finishInterview();
      return;
    }

    await speakText("Alright, let us move to the next question.");
    setCurrentIndex(currentIndex + 1);
    setTimeout(() => {
      if (isMicOn) startMic();
    }, 500);
  };

  useEffect(() => {
    if (isIntroPhase || !currentQuestion) return;
    if (!isTechnicalMode && timeLeft === 0 && !isSubmitting && !feedback) {
      submitAnswer();
    }
  }, [timeLeft, isIntroPhase, currentQuestion, isSubmitting, feedback, isTechnicalMode]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      }
      if (detectionIntervalRef.current) {
        window.clearInterval(detectionIntervalRef.current);
      }
      alertTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.speechSynthesis.cancel();
      cameraStreamRef.current?.getTracks()?.forEach((track) => track.stop());
    };
  }, []);

  const activeWarningBadges = activeWarningTypes.map((type) => {
    const config = PROCTORING_ALERTS[type];
    return { type, label: config?.label || type, severity: config?.severity || "medium" };
  });

  const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        
        {/* Left Col: Answer Text Area & Controls */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  Question {currentIndex + 1} of {questions.length}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {isIntroPhase ? "Introduction" : "Answer freely. The AI is listening."}
                </p>
              </div>

              {!isIntroPhase && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Timer timeLeft={timeLeft} totalTime={currentQuestion?.timeLimit || 60} />
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-lg font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                {isIntroPhase
                  ? "Getting ready for the interview..."
                  : currentQuestion?.question}
              </p>
            </div>

            <div className="relative">
              <textarea
                value={currentState.answer}
                onChange={(e) => {
                  answerRef.current = e.target.value;
                  updateCurrentState({ answer: e.target.value });
                }}
                placeholder={
                  isIntroPhase
                    ? "Warm up your vocal cords..."
                    : isMicOn
                    ? "Speak your answer or type here..."
                    : "Type your answer here or turn on the microphone..."
                }
                disabled={isIntroPhase}
                className="min-h-[160px] w-full resize-y rounded-xl border border-slate-200 bg-transparent p-4 text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:text-slate-200 dark:placeholder-slate-500 sm:min-h-[220px]"
              />

              <div className="absolute bottom-4 right-4 flex items-center gap-3">
                <button
                  onClick={toggleMic}
                  disabled={!speechSupported || isIntroPhase}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isMicOn
                      ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                  {isMicOn ? "Stop Mic" : "Start Mic"}
                </button>
              </div>

              {isListening && isMicOn && !isAIPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  Listening...
                </motion.div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              {feedback ? (
                <div className="flex-1 rounded-xl bg-emerald-50 p-4 border border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-200">
                  <p className="text-sm font-medium">AI Evaluated:</p>
                  <p className="mt-1 text-sm">{feedback}</p>
                </div>
              ) : (
                <div className="flex-1"></div>
              )}
              
              <div className="flex gap-3">
                {!feedback ? (
                  <button
                    onClick={submitAnswer}
                    disabled={isIntroPhase || isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Evaluating..." : "Submit Answer"}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    disabled={isIntroPhase || isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {currentIndex < questions.length - 1 ? (
                      <>
                        Next Question <BsArrowRight />
                      </>
                    ) : (
                      "Finish Interview"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: AI Interviewer */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Your AI Interviewer</h3>
            </div>
            <div className="relative aspect-video w-full bg-slate-950">
              <video
                ref={videoRef}
                src={voiceGender === "female" ? femaleVideo : maleVideo}
                className="h-full w-full object-cover"
                playsInline
                muted
                loop
              />

              {isAIPlaying && subtitle && (
                <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
                  <div className="max-w-[90%] rounded-lg bg-black/75 px-3 py-2 text-center text-sm font-medium text-white backdrop-blur-sm">
                    {subtitle}
                  </div>
                </div>
              )}

              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                      isAIPlaying ? "bg-emerald-400" : "bg-slate-400"
                    }`}
                  ></span>
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      isAIPlaying ? "bg-emerald-500" : "bg-slate-500"
                    }`}
                  ></span>
                </span>
                {isAIPlaying ? "AI Speaking" : "AI Listening"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300">Tips for success</h4>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-blue-800 dark:text-blue-400">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500">•</span> You can pause before answering.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500">•</span> If the microphone misses something, you can manually type it in.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500">•</span> Take your time to formulate your thoughts.
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Step2Interview;
