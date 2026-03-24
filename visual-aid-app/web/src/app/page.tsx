"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";

// Dynamic import to avoid SSR issues with webcam/tensorflow
const ObjectDetector = dynamic(() => import("@/components/ObjectDetector"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-white text-xl animate-pulse">Initializing Camera...</div>
    </div>
  ),
});

interface Detection {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

interface TrackedObject {
  id: string;
  class: string;
  approaching: boolean;
}

export default function Home() {
  const [status, setStatus] = useState("Tap to start voice control");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [queryTrigger, setQueryTrigger] = useState(0);
  const lastAlertRef = useRef<number>(0);

  const handleCommand = useCallback((command: string) => {
    if (command === "identify") {
      setQueryTrigger((prev) => prev + 1);
    } else if (command === "help") {
      speak(
        "Say 'what is that' to identify objects. I will also warn you if someone is approaching."
      );
    } else if (command === "stop") {
      window.speechSynthesis?.cancel();
    }
  }, []);

  const { isListening, transcript, speak, startListening, stopListening, error } =
    useVoiceAssistant(handleCommand);

  const handleDetections = useCallback((newDetections: Detection[]) => {
    setDetections(newDetections);
  }, []);

  const handleApproaching = useCallback(
    (object: TrackedObject) => {
      const now = Date.now();
      // Throttle alerts to once every 3 seconds
      if (now - lastAlertRef.current > 3000) {
        lastAlertRef.current = now;
        speak(`Warning! ${object.class} approaching`);
        setStatus(`⚠️ ${object.class} approaching!`);
      }
    },
    [speak]
  );

  const handleQueryResponse = useCallback(
    (response: string) => {
      speak(response);
      setStatus(response);
    },
    [speak]
  );

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      setStatus("Voice control paused");
    } else {
      startListening();
      setStatus("Listening for commands...");
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Camera and Detection Overlay */}
      <ObjectDetector
        onDetections={handleDetections}
        onApproaching={handleApproaching}
        onQueryResponse={handleQueryResponse}
        queryTrigger={queryTrigger}
      />

      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${isListening ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
            />
            <span className="text-white text-sm font-medium">
              {isListening ? "Listening" : "Voice Off"}
            </span>
          </div>
          <div className="text-white/80 text-sm">
            {detections.length} objects detected
          </div>
        </div>
      </div>

      {/* Center Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="w-20 h-20 border-2 border-white/50 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      </div>

      {/* Bottom Control Panel */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent p-6">
        {/* Status Display */}
        <div className="mb-4 text-center">
          <p className="text-white text-lg font-medium">{status}</p>
          {transcript && (
            <p className="text-white/60 text-sm mt-1">Heard: "{transcript}"</p>
          )}
          {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4">
          {/* Main Listen Button */}
          <button
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isListening
                ? "bg-green-500 scale-110 shadow-lg shadow-green-500/50"
                : "bg-white/20 hover:bg-white/30"
              }`}
          >
            <svg
              className="w-10 h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
          </button>

          {/* Quick Identify Button */}
          <button
            onClick={() => setQueryTrigger((prev) => prev + 1)}
            className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-all"
          >
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="text-white/50 text-xs text-center mt-4">
          Say "What is that?" or tap the search button to identify objects
        </p>
      </div>
    </div>
  );
}
