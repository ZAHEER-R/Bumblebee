let recognition: SpeechRecognition | null = null;

export function startListening(
  onResult: (text: string) => void,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
) {
  if (typeof window === "undefined") return;

  const SpeechRecognitionAPI =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    alert("Speech Recognition is not supported.");
    return;
  }

    recognition = new SpeechRecognitionAPI();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = "en-US";

recognition.onstart = () => {
  console.log("Mic started");
  onStart?.();
};

recognition.onspeechstart = () => {
  console.log("Speech detected");
};

recognition.onspeechend = () => {
  console.log("Speech ended");
};

recognition.onend = () => {
  console.log("Recognition ended");
  recognition = null;
  onEnd?.();
};

recognition.onerror = (e) => {
  console.log("Speech error:", e.error);
  recognition = null;
  onError?.();
};

  recognition.start();
}

export function stopListening() {
  recognition?.stop();
  recognition = null;
}