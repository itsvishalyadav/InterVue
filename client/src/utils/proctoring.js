export const PROCTORING_ALERTS = {
  camera_blocked: {
    label: "Camera blocked",
    description: "Camera access is required for live proctoring.",
    severity: "high",
    activationMs: 0,
  },
  detector_offline: {
    label: "Face detector offline",
    description: "Face checks could not start, so only tab-visibility monitoring is active.",
    severity: "medium",
    activationMs: 0,
  },
  tab_hidden: {
    label: "Tab switched",
    description: "The interview tab is no longer visible.",
    severity: "high",
    activationMs: 400,
  },
  no_face: {
    label: "Face missing",
    description: "Keep your face centered in the frame.",
    severity: "high",
    activationMs: 2500,
  },
  multiple_faces: {
    label: "Multiple faces detected",
    description: "Only one candidate should be visible during the interview.",
    severity: "high",
    activationMs: 1200,
  },
  looking_away: {
    label: "Looking away",
    description: "Please keep your attention on the interview screen.",
    severity: "medium",
    activationMs: 1800,
  },
};

const LANDMARK_INDEX = {
  noseTip: 1,
  forehead: 10,
  chin: 152,
  leftEyeOuter: 33,
  rightEyeOuter: 263,
};

const safePoint = (landmarks, index) => landmarks?.[index] || null;

export const estimateAttention = (landmarks) => {
  const noseTip = safePoint(landmarks, LANDMARK_INDEX.noseTip);
  const forehead = safePoint(landmarks, LANDMARK_INDEX.forehead);
  const chin = safePoint(landmarks, LANDMARK_INDEX.chin);
  const leftEye = safePoint(landmarks, LANDMARK_INDEX.leftEyeOuter);
  const rightEye = safePoint(landmarks, LANDMARK_INDEX.rightEyeOuter);

  if (!noseTip || !forehead || !chin || !leftEye || !rightEye) {
    return { isLookingAway: false, yaw: 0, pitch: 0 };
  }

  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const eyeDistance = Math.max(Math.abs(rightEye.x - leftEye.x), 0.001);
  const faceHeight = Math.max(Math.abs(chin.y - forehead.y), 0.001);

  const yaw = Math.abs((noseTip.x - eyeMidX) / eyeDistance);
  const pitch = Math.abs((noseTip.y - eyeMidY) / faceHeight - 0.18);

  return {
    isLookingAway: yaw > 0.16 || pitch > 0.2,
    yaw,
    pitch,
  };
};

export const getAlertAppearance = (severity) => {
  if (severity === "high") {
    return {
      badge: "bg-rose-100 text-rose-700 border-rose-200",
      panel: "border-rose-200 bg-rose-50 text-rose-900",
      dot: "bg-rose-500",
    };
  }

  return {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    panel: "border-amber-200 bg-amber-50 text-amber-900",
    dot: "bg-amber-500",
  };
};

export const buildWarningMessage = (type, extra = {}) => {
  if (type === "multiple_faces" && extra.faceCount > 1) {
    return `${extra.faceCount} faces are visible in the frame.`;
  }

  if (type === "looking_away") {
    return "Eyes or head orientation moved away from the screen.";
  }

  return PROCTORING_ALERTS[type]?.description || "Suspicious activity detected.";
};
