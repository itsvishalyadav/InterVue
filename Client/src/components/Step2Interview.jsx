import React, { useEffect, useMemo, useRef, useState } from "react";
import maleVideo from "../assets/videos/male-ai.mp4";
import femaleVideo from "../assets/videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "motion/react";
import { BsArrowRight } from "react-icons/bs";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa6";
import axios from "axios";
import { ServerUrl } from "../App";

function Step2Interview({ interviewData, onFinish }) {
  const { questions, userName, voicePreference = "female" } = interviewData;

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
  const micStreamRef = useRef(null);

  const [questionStates, setQuestionStates] = useState(
    questions.map(() => ({ answer: "" }))
  );

  const currentQuestion = questions[currentIndex];
  const currentState = questionStates[currentIndex] || { answer: "" };
  const suggestedMinutes = Math.max(1, Math.round((currentQuestion?.timeLimit || 60) / 60));

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
      return true;
    } catch (error) {
      console.log("microphone permission denied", error);
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
        videoRef.current?.play().catch(() => {});
      };

      utterance.onend = () => {
        if (videoRef.current) {
          videoRef.current.pause();
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
        await speakText("I will ask you a few questions. Just answer naturally, and take your time. Let us begin.");
        setIsIntroPhase(false);
      } else if (currentQuestion) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (currentIndex === questions.length - 1 && currentIndex > 0) {
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

      if (event?.error === "not-allowed" || event?.error === "audio-capture") {
        shouldKeepListeningRef.current = false;
        setIsMicOn(false);
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
            } catch {}
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

  const toggleMic = async () => {
    if (isMicOn) {
      setIsMicOn(false);
      stopMic();
    } else {
      setIsMicOn(true);
      await startMic();
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
          question: currentQuestion.question,
          answer: currentState.answer || "No string provided",
          mode: interviewData.mode || "Technical",
        },
        { withCredentials: true }
      );

      const feedbackMessage = result.data.evaluation?.feedback || result.data.feedback || "Thank you. Let's proceed.";
      setFeedback(feedbackMessage);
      updateCurrentState({ evaluation: result.data.evaluation });
      speakText(feedbackMessage);
    } catch (error) {
      console.log(error);
      const errMsg = "We had an issue catching that, please try again.";
      setFeedback(errMsg);
      speakText(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishInterview = async () => {
    if (isSubmitting) return;
    stopMic();
    setIsMicOn(false);
    setIsSubmitting(true);

    try {
      const answersList = questionStates.map((state, i) => ({
        question: questions[i].question,
        answer: state.answer || "Skipped",
        evaluation: state.evaluation 
      }));

      const result = await axios.post(ServerUrl + "/api/interview/finish", { answers: answersList, mode: interviewData.mode || "Technical" }, { withCredentials: true });
      
      const finalReport = {
         ...interviewData,
         ...result.data.summary,
         questionWiseScore: result.data.questionWiseScore
      };
      
      onFinish(finalReport);
    } catch (error) {
      console.log(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    setFeedback("");
    window.speechSynthesis.cancel();
    stopMic();

    if (currentIndex + 1 >= questions.length) {
      finishInterview();
      return;
    }

    setCurrentIndex(currentIndex + 1);
    setTimeout(() => {
      if (isMicOnRef.current) startMic();
    }, 500);
  };

  useEffect(() => {
    if (isIntroPhase || !currentQuestion) return;
    if (timeLeft === 0 && !isSubmitting && !feedback) {
      submitAnswer();
    }
  }, [timeLeft, isIntroPhase, currentQuestion, isSubmitting, feedback]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

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
                onChange={(e) => updateCurrentState({ answer: e.target.value })}
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
