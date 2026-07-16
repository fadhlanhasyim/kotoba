// Browser TTS (Web Speech API) — no audio assets, no hosting. Quality depends on the
// browser/OS's installed Japanese voice, but it's a correct reading, which is enough for
// "does this match what I expected." Real recordings are a later, much bigger lift.

export function canSpeakJapanese(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakJapanese(text: string) {
  if (!canSpeakJapanese()) return;
  window.speechSynthesis.cancel(); // avoid overlapping utterances if pressed repeatedly
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}
