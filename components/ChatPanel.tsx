"use client";

import {
  handleVoiceCommand
} from "@/lib/voice/commands";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/core/types";
import { ChevronDown, Eraser, LayoutGrid, Plus, Wrench } from "lucide-react";
import { detectWakeWord, stripWakeWord } from "@/lib/voice/wakeword";
import { GEMINI_MODELS } from "@/core/models";

import {
  startListening,
  stopListening,
} from "@/lib/voice/speech";

import {
setUltronStatus
} from "@/lib/status/statusManager";

import {
  speak,
  stopSpeaking,
  unlockSpeech,
} from "@/lib/voice/tts";
import type { VoiceMode } from "@/lib/voice/tts";

import {
formatAIResponse
} from "@/lib/formatAI";

import {
 stopVoice
} from "@/lib/voice/voiceManager";

import "./chatpanel.css";

const COMMAND_GROUPS = [
  { category: "Apps", commands: ["open_app", "close_app", "list_running_apps", "list_installed_apps"] },
  { category: "Files & Folders", commands: ["create_folder", "move_file", "copy_file", "delete_path", "list_dir"] },
  { category: "Browser & Search", commands: ["open_url", "search_youtube", "search_google"] },
  { category: "Keyboard Input", commands: ["type_text", "press_keys"] },
  { category: "Window & System", commands: ["set_window_layout", "take_screenshot", "get_system_info", "run_powershell"] },
  { category: "Media", commands: ["play_spotify", "media_play_pause", "media_next", "media_previous", "volume_set", "volume_mute"] },
  { category: "Productivity", commands: ["write_notepad", "draw_in_paint", "set_alarm"] },
];

type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const CHAT_STORAGE_KEY = "bumblebee.chat-history.v1";
const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Hello. I am Bumblebee. Systems online.",
};

function createChatSession(): ChatSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [WELCOME_MESSAGE],
  };
}

export default function ChatPanel() {

  const [open, setOpen] = useState(true);
  const [showCommands, setShowCommands] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const [input, setInput] = useState("");
  const [transcript, setTranscript] = useState("");

  const [listening, setListening] = useState(false);
  const [activeModel, setActiveModel] = useState(GEMINI_MODELS[0]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [modelError, setModelError] = useState("");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("adam");

  useEffect(() => {
    const savedModel = window.localStorage.getItem("bumblebee.gemini-model");
    const preferredModel = savedModel && GEMINI_MODELS.includes(savedModel)
      ? savedModel
      : GEMINI_MODELS[0];
    const savedVoice = window.localStorage.getItem("bumblebee.voice-mode");
    if (savedVoice === "adam" || savedVoice === "eve") setVoiceMode(savedVoice);

    if (!window.ultron) {
      setActiveModel(preferredModel);
      return;
    }

    const applyModel = savedModel && GEMINI_MODELS.includes(savedModel)
      ? window.ultron.setModel(preferredModel)
      : window.ultron.getModel();
    applyModel
      .then(setActiveModel)
      .catch((error: unknown) => {
        console.error("Unable to load Bumblebee model settings:", error);
        setModelError("Could not load the selected Gemini model.");
      });
  }, []);

  useEffect(() => {
    let saved: { sessions?: ChatSession[]; activeChatId?: string } | null = null;
    try {
      const rawHistory = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (rawHistory) saved = JSON.parse(rawHistory);
    } catch (error) {
      console.warn("Unable to load Bumblebee chat history:", error);
    }

    if (saved?.sessions?.length) {
      const currentId = saved.sessions.some((session) => session.id === saved?.activeChatId)
        ? saved.activeChatId!
        : saved.sessions[0].id;
      setSessions(saved.sessions);
      setActiveChatId(currentId);
      setMessages(saved.sessions.find((session) => session.id === currentId)?.messages ?? [WELCOME_MESSAGE]);
    } else {
      const firstSession = createChatSession();
      setSessions([firstSession]);
      setActiveChatId(firstSession.id);
      setMessages(firstSession.messages);
    }
    setHistoryLoaded(true);
  }, []);

  useEffect(() => {
    if (historyLoaded) {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ sessions, activeChatId }));
    }
  }, [sessions, activeChatId, historyLoaded]);

  const [messages, setMessages] = useState<ChatMessage[]>([  {
      role: "assistant",
      content: "Hello. I am Bumblebee. Systems online."
    }
  ]);

  function updateChatMessages(chatId: string, update: (current: ChatMessage[]) => ChatMessage[]) {
    setSessions((currentSessions) => currentSessions.map((session) => {
      if (session.id !== chatId) return session;
      const nextMessages = update(session.messages);
      const firstUserMessage = nextMessages.find((message) => message.role === "user");
      return {
        ...session,
        messages: nextMessages,
        title: firstUserMessage?.content.replace(/\s+/g, " ").slice(0, 48) || "New chat",
        updatedAt: new Date().toISOString(),
      };
    }));

    if (chatId === activeChatId) setMessages(update);
  }

  function appendChatMessage(chatId: string, message: ChatMessage) {
    updateChatMessages(chatId, (current) => [...current, message]);
  }

  function startNewChat() {
    stopListening();
    setListening(false);
    setTranscript("");
    setInput("");
    setShowCommands(false);
    setShowHistory(false);
    const session = createChatSession();
    setSessions((current) => [session, ...current]);
    setActiveChatId(session.id);
    setMessages(session.messages);
  }

  function clearCurrentChat() {
    if (!activeChatId) return;
    updateChatMessages(activeChatId, () => []);
    setInput("");
    setTranscript("");
    setShowCommands(false);
    setShowHistory(false);
    speak("Chat cleared.");
  }

  function deleteChat(chatId: string) {
    const remaining = sessions.filter((session) => session.id !== chatId);
    if (remaining.length === 0) {
      const session = createChatSession();
      setSessions([session]);
      setActiveChatId(session.id);
      setMessages(session.messages);
      return;
    }

    setSessions(remaining);
    if (chatId === activeChatId) {
      setActiveChatId(remaining[0].id);
      setMessages(remaining[0].messages);
    }
  }

  function formatChatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  function clearLongPressTimer() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }

  function speakReply(text: string) {
    speak(text, undefined, (message) => {
      appendChatMessage(activeChatId, { role: "assistant", content: message });
    }, voiceMode);
  }

  async function selectModel(model: string) {
    setModelError("");
    try {
      const selectedModel = window.ultron
        ? await window.ultron.setModel(model)
        : model;
      setActiveModel(selectedModel);
      window.localStorage.setItem("bumblebee.gemini-model", selectedModel);
      setShowModelMenu(false);
    } catch (error) {
      console.error("Unable to switch Gemini model:", error);
      setModelError("Could not switch models. Please try again.");
    }
  }

  function toggleVoiceMode() {
    const nextMode = voiceMode === "adam" ? "eve" : "adam";
    setVoiceMode(nextMode);
    window.localStorage.setItem("bumblebee.voice-mode", nextMode);
  }

  async function processMessage(message: string) {
    const chatId = activeChatId;
    if (!chatId) return;
    unlockSpeech();
    const request = stripWakeWord(message);
    if (!request) {
      if (detectWakeWord(message)) {
        const reply = "I'm here. What can I do for you?";
        appendChatMessage(chatId, { role: "assistant", content: reply });
        speakReply(reply);
      }
      return;
    }
    setInput("");
    stopListening();
    setListening(false);
    setUltronStatus(
"THINKING"
);

    const command = handleVoiceCommand(request);


if(command.handled){

  if(command.action==="STOP_SPEAKING"){
    stopSpeaking();
  speakReply("Okay, I stopped speaking.");
    return;

  }


if(command.action==="STOP_LISTENING"){

    stopVoice();

    setListening(false);

    speakReply("Bumblebee voice access disabled.");

    return;

}


  if(command.action==="CLEAR_CHAT"){

    clearCurrentChat();

    return;

  }


  if(command.action==="GREETING"){

    const reply = "Bumblebee is ready.";
    appendChatMessage(chatId, { role: "assistant", content: reply });
    speakReply(reply);

    return;

  }

}

    const user: ChatMessage = {
      role: "user",
      content: request
    };

    appendChatMessage(chatId, user);

    try {

      let reply: string;
      let usedTools: string[] = [];
      if (window.ultron) {
        const data = await window.ultron.chat(request);
        reply = data.reply;
        usedTools = data.tools;
        setActiveModel(data.model);
        window.localStorage.setItem("bumblebee.gemini-model", data.model);
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: request, model: activeModel }),
        });
        const data: { reply?: string; error?: string; model?: string } = await res.json();
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : `AI request failed (${res.status}).`);
        }
        reply = data.reply ?? data.error ?? "Bumblebee connection failed.";
        if (typeof data.model === "string") {
          setActiveModel(data.model);
          window.localStorage.setItem("bumblebee.gemini-model", data.model);
        }
      }
      const formattedReply = formatAIResponse(reply);
      appendChatMessage(chatId, {
        role: "assistant",
        content: usedTools.length
          ? `${formattedReply}\nTools: ${usedTools.join(" → ")}`
          : formattedReply,
      });
      speakReply(formattedReply);
    }

    catch(error){
      const errorMessage = error instanceof TypeError
        ? "Could not reach the Bumblebee chat service. Make sure the app is running, then try again."
        : error instanceof Error
          ? error.message
          : "The Bumblebee chat request failed.";

      appendChatMessage(chatId, { role: "assistant", content: errorMessage });
      speakReply(errorMessage);

    }

  }

  async function sendMessage(){
    const message = input.trim();
    if (!message) return;
    unlockSpeech();
    setInput("");
    await processMessage(message);
  }

function startVoice(){

    if (!("SpeechRecognition" in window) && !("webkitSpeechRecognition" in window)) {
      appendChatMessage(activeChatId, {
        role: "assistant",
        content: "Speech recognition is not available in this browser. Use the Bumblebee desktop app or type your message.",
      });
      return;
    }

    const started = startListening(
      (text) => { void processMessage(text); },
      () => setUltronStatus("LISTENING"),
      () => setListening(false),
      (text) => {
        setTranscript(text);
        setInput(text);
      },
      true,
      (message) => {
        appendChatMessage(activeChatId, { role: "assistant", content: message });
        speakReply(message);
      },
    );
    setListening(started);

}

function toggleVoiceCapture() {
  if (listening) {
    stopListening(true);
    return;
  }
  setTranscript("");
  startVoice();
}

  if(!open){

    return(

      <button

        className="ultron-mini-bot"

        onClick={()=>setOpen(true)}

      >

        🤖

      </button>

    );

  }

  return(

    <div className="ultron-chat">

      <div className="chat-header">
        <div className="header-title">
          <span className="status-dot"></span>
          <span>BUMBLEBEE AI</span>
          <button
            type="button"
            className="model-picker-toggle"
            aria-expanded={showModelMenu}
            aria-haspopup="listbox"
            onClick={() => setShowModelMenu((visible) => !visible)}
            title="Choose Gemini model"
          >
            {activeModel}
            <ChevronDown size={13} aria-hidden="true" />
          </button>
        </div>

        {showModelMenu && (
          <div className="model-picker-menu" role="listbox" aria-label="Gemini models">
            <div className="model-picker-heading">SELECT MODEL</div>
            {GEMINI_MODELS.map((model) => (
              <button
                type="button"
                role="option"
                aria-selected={activeModel === model}
                className={`model-picker-option${activeModel === model ? " selected" : ""}`}
                key={model}
                onClick={() => void selectModel(model)}
              >
                {model}
              </button>
            ))}
            {modelError && <p className="model-picker-error" role="alert">{modelError}</p>}
          </div>
        )}

        <button
          type="button"
          className={`history-toggle${showHistory ? " selected" : ""}`}
          aria-label={showHistory ? "Close chat history" : "Open chat history"}
          aria-expanded={showHistory}
          onClick={() => {
            setShowCommands(false);
            setShowHistory((visible) => !visible);
          }}
          title="Chat history"
        >
          <LayoutGrid size={17} aria-hidden="true" />
        </button>

        <button

          className="chat-close"

          onClick={()=>setOpen(false)}

        >

          ×

        </button>

      </div>

      <div className="chat-actions">
        <button type="button" onClick={startNewChat} title="Start a new conversation">
          <Plus size={15} aria-hidden="true" /> New Chat
        </button>
        <button type="button" onClick={clearCurrentChat} title="Clear this conversation">
          <Eraser size={15} aria-hidden="true" /> Clear Chat
        </button>
        <button
          type="button"
          className={showCommands ? "selected" : ""}
          aria-expanded={showCommands}
          onClick={() => {
            setShowHistory(false);
            setShowCommands((visible) => !visible);
          }}
          title="Show desktop commands"
        >
          <Wrench size={15} aria-hidden="true" /> Tools
        </button>
        <button type="button" className="voice-mode-toggle" onClick={toggleVoiceMode} title="Switch spoken voice">
          {voiceMode === "adam" ? "ADAM" : "EVE"}
        </button>
      </div>

      {showHistory ? (
        <section className="chat-history" aria-label="Saved conversations">
          <div className="history-heading">CHAT HISTORY</div>
          {sessions
            .filter((session) => session.messages.some((message) => message.role === "user"))
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
            .map((session) => (
              <button
                type="button"
                className={`history-entry${session.id === activeChatId ? " current" : ""}`}
                key={session.id}
                title="Hold to delete this conversation"
                onClick={() => {
                  if (longPressTriggered.current) {
                    longPressTriggered.current = false;
                    return;
                  }
                  setActiveChatId(session.id);
                  setMessages(session.messages);
                  setShowHistory(false);
                }}
                onPointerDown={() => {
                  clearLongPressTimer();
                  longPressTriggered.current = false;
                  longPressTimer.current = setTimeout(() => {
                    longPressTriggered.current = true;
                    if (window.confirm(`Delete “${session.title}” from chat history?`)) deleteChat(session.id);
                  }, 650);
                }}
                onPointerUp={clearLongPressTimer}
                onPointerLeave={clearLongPressTimer}
                onContextMenu={(event) => {
                  event.preventDefault();
                  clearLongPressTimer();
                  if (window.confirm(`Delete “${session.title}” from chat history?`)) deleteChat(session.id);
                }}
              >
                <span className="history-title">{session.title}</span>
                <time dateTime={session.updatedAt}>{formatChatDate(session.updatedAt)}</time>
              </button>
            ))}
          {sessions.every((session) => !session.messages.some((message) => message.role === "user")) && (
            <p className="history-empty">Your conversations will appear here.</p>
          )}
        </section>
      ) : showCommands ? (
        <section className="tool-catalog" aria-label="Available desktop commands">
          <div className="tool-catalog-heading">
            <span>AVAILABLE COMMANDS</span>
            <span>27</span>
          </div>
          {COMMAND_GROUPS.map(({ category, commands }) => (
            <section className="tool-group" key={category}>
              <h2>{category}</h2>
              <ul>
                {commands.map((command) => <li key={command}>{command}</li>)}
              </ul>
            </section>
          ))}
        </section>
      ) : (
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={msg.role === "user" ? "message user" : "message assistant"}>
              <span>{msg.role === "user" ? "YOU" : "BUMBLEBEE"}</span>
              <p className="ai-text">{msg.content}</p>
            </div>
          ))}
        </div>
      )}

      {

        listening &&

        <div className="listening" role="status" aria-live="polite">
          <span>BUMBLEBEE LISTENING</span>
          <p>{transcript || "Listening for your voice..."}</p>
          <small>Sending when you finish speaking · tap mic to stop</small>
        </div>

      }

      <div className="chat-input-area">

        <input

          value={input}
          disabled={!historyLoaded}
          placeholder={historyLoaded ? "Talk to Bumblebee..." : "Loading chat..."}

          onChange={(e)=>setInput(e.target.value)}
          onFocus={() => {
            setShowCommands(false);
            setShowHistory(false);
          }}

          onKeyDown={(e)=>{

            if(e.key==="Enter")

              sendMessage();

          }}

        />

        <button
          className={listening ? "mic-btn active" : "mic-btn" }
          disabled={!historyLoaded}
          onClick={toggleVoiceCapture}
          aria-label={listening ? "Stop listening and send transcript" : "Activate Bumblebee voice input"}
          title={listening ? "Stop listening and send" : "Activate Bumblebee voice input"}
        >
          <p>{listening ? "SEND" : "MIC"}</p>
        </button>

        <button className="send-btn" onClick={sendMessage} disabled={!historyLoaded}>
          SEND
        </button>

        <button
          className="stop-ai-btn"
          onClick={() => {
            stopVoice();
            stopSpeaking();
            setInput("");
            setTranscript("");
            setListening(false);
          }}
        >
         <p>STOP</p>
        </button>

      </div>

    </div>

  );

}