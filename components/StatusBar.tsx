"use client";

import { useState, useEffect } from "react";

import {
  getUltronStatus,
  subscribeStatus,
  UltronStatus,
} from "@/lib/status/statusManager";

import "./statusbar.css";

const icons = {
  READY: "🟢",
  LISTENING: "🎤",
  THINKING: "🧠",
  SPEAKING: "🔊",
  SLEEPING: "💤",
};

export default function StatusBar() {

  const [status, setStatus] = useState<UltronStatus>(
    getUltronStatus()
  );

  useEffect(() => {

    const unsubscribe = subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;

  }, []);

  return (
    <div className="ultron-status">

      <div className="status-light"></div>

      <span className="status-text">
        {icons[status]} BUMBLEBEE : {status}
      </span>

    </div>
  );
}