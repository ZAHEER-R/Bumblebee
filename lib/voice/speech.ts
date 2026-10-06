import {
setUltronStatus
} from "@/lib/status/statusManager";

let recognition: SpeechRecognition | null = null;
let finalTranscript = "";
let interimTranscript = "";
let submitOnStop = false;
let listeningRequested = false;
let autoSubmitFinal = true;
let restartTimer: ReturnType<typeof setTimeout> | null = null;
let submitTimer: ReturnType<typeof setTimeout> | null = null;
let finalTextCallback: ((text: string) => void) | null = null;
let interimTextCallback: ((text: string) => void) | null = null;
let startCallback: (() => void) | undefined;
let endCallback: (() => void) | undefined;
let errorCallback: ((message: string) => void) | undefined;

export function startListening(
  onFinalText: (text: string) => void,
  onStart?: () => void,
  onEnd?: () => void,
  onInterimText?: (text: string) => void,
  sendOnFinal = true,
  onError?: (message: string) => void
): boolean {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    onError?.("Speech recognition is unavailable in this browser. Use the Bumblebee desktop app or type your message.");
    return false;
  }

  stopListening();
  if (restartTimer) clearTimeout(restartTimer);
  if (submitTimer) clearTimeout(submitTimer);
  finalTextCallback = onFinalText;
  interimTextCallback = onInterimText ?? null;
  startCallback = onStart;
  endCallback = onEnd;
  errorCallback = onError;
  autoSubmitFinal = sendOnFinal;
  listeningRequested = true;
  submitOnStop = false;
  finalTranscript = "";
  interimTranscript = "";
  startRecognition(Recognition);
  return true;
}

export function stopListening(submitTranscript = false) {
  listeningRequested = false;
  submitOnStop = submitTranscript;
  if (restartTimer) clearTimeout(restartTimer);
  if (submitTimer) clearTimeout(submitTimer);
  restartTimer = null;
  submitTimer = null;

  if (recognition) {
    recognition.stop();
  } else {
    const transcript = takeTranscript();
    if (submitTranscript && transcript) finalTextCallback?.(transcript);
    endCallback?.();
  }
}

function startRecognition(Recognition: SpeechRecognitionConstructor) {
  if (!listeningRequested) return;
  let current: SpeechRecognition;
  try {
    current = new Recognition();
  } catch (error) {
    listeningRequested = false;
    const message = "Could not initialize speech recognition. Check microphone permissions and try again.";
    errorCallback?.(message);
    endCallback?.();
    setUltronStatus("READY");
    console.error("Unable to initialize speech recognition:", error);
    return;
  }
  recognition = current;
  current.lang = "en-IN";
  current.continuous = true;
  current.interimResults = true;
  current.maxAlternatives = 1;

  current.onstart = () => {
    setUltronStatus("LISTENING");
    startCallback?.();
  };

  current.onresult = (event: SpeechRecognitionEvent) => {
    const interimParts: string[] = [];
    let receivedFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript.trim();
      if (!text) continue;
      if (result.isFinal) {
        finalTranscript = [finalTranscript, text].filter(Boolean).join(" ");
        receivedFinal = true;
      } else {
        interimParts.push(text);
      }
    }

    interimTranscript = interimParts.join(" ");
    interimTextCallback?.([finalTranscript, interimTranscript].filter(Boolean).join(" "));
    if (receivedFinal && autoSubmitFinal) {
      if (submitTimer) clearTimeout(submitTimer);
      submitTimer = setTimeout(() => stopListening(true), 850);
    }
  };

  current.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (["not-allowed", "service-not-allowed", "audio-capture"].includes(event.error)) {
      listeningRequested = false;
      recognition = null;
      const message = event.error === "audio-capture"
        ? "No microphone is available. Check the device and permissions."
        : "Microphone access is blocked. Allow it for this app, then try again.";
      errorCallback?.(message);
      setUltronStatus("READY");
      endCallback?.();
    }
  };

  current.onend = () => {
    if (recognition !== current) return;
    recognition = null;
    const transcript = takeTranscript();
    if (submitOnStop || (autoSubmitFinal && transcript)) {
      listeningRequested = false;
      submitOnStop = false;
      if (transcript) {
        setUltronStatus("THINKING");
        finalTextCallback?.(transcript);
      }
      interimTextCallback?.("");
      endCallback?.();
      return;
    }

    if (listeningRequested) {
      restartTimer = setTimeout(() => startRecognition(Recognition), 250);
    } else {
      endCallback?.();
    }
  };

  try {
    current.start();
  } catch (error) {
    console.error("Unable to start speech recognition:", error);
    listeningRequested = false;
    recognition = null;
    errorCallback?.("Could not start the microphone. Check app permissions and try again.");
    setUltronStatus("READY");
    endCallback?.();
  }
}

function takeTranscript() {
  const transcript = [finalTranscript, interimTranscript].filter(Boolean).join(" ").trim();
  finalTranscript = "";
  interimTranscript = "";
  return transcript;
}