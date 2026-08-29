"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./VoiceAgentPanel.module.css";

type Status = "idle" | "connecting" | "listening" | "speaking" | "error";
type Transcript = { id: string; role: "user" | "agent"; text: string; final: boolean };
type ServerEvent = { type?: string; delta?: string; transcript?: string; response_id?: string; error?: { message?: string } };

export function VoiceAgentPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname(); const priorPath = useRef(pathname);
  const peer = useRef<RTCPeerConnection | null>(null); const channel = useRef<RTCDataChannel | null>(null);
  const stream = useRef<MediaStream | null>(null); const audio = useRef<HTMLAudioElement | null>(null);
  const conversationId = useRef<string | null>(null); const responseActive = useRef(false);
  const [status, setStatus] = useState<Status>("idle"); const [error, setError] = useState("");
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);

  const end = useCallback(() => {
    channel.current?.close(); channel.current = null;
    peer.current?.getSenders().forEach((sender) => sender.track?.stop()); peer.current?.close(); peer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null;
    if (audio.current) { audio.current.pause(); audio.current.srcObject = null; }
    conversationId.current = null; responseActive.current = false; setStatus("idle");
  }, []);

  useEffect(() => () => end(), [end]);
  useEffect(() => { if (priorPath.current !== pathname) { end(); priorPath.current = pathname; } }, [end, pathname]);

  function addFinal(role: "user" | "agent", text: string) {
    const clean = text.trim(); if (!clean) return;
    setTranscripts((current) => [...current.filter((item) => !(item.role === role && !item.final)), { id: crypto.randomUUID(), role, text: clean, final: true }]);
  }
  function addAgentDelta(delta: string) {
    if (!delta) return;
    setTranscripts((current) => { const last = current.at(-1); return last?.role === "agent" && !last.final ? [...current.slice(0, -1), { ...last, text: last.text + delta }] : [...current, { id: crypto.randomUUID(), role: "agent", text: delta, final: false }]; });
  }
  async function persistUser(text: string) {
    if (!conversationId.current) return;
    await fetch(`/api/v1/realtime/conversations/${conversationId.current}/turns`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => undefined);
  }
  function handleServerEvent(event: MessageEvent<string>) {
    let message: ServerEvent; try { message = JSON.parse(event.data) as ServerEvent; } catch { return; }
    if (message.type === "input_audio_buffer.speech_started") {
      setStatus("listening");
      if (responseActive.current && channel.current?.readyState === "open") {
        channel.current.send(JSON.stringify({ type: "response.cancel" }));
        channel.current.send(JSON.stringify({ type: "output_audio_buffer.clear" }));
      }
    }
    if (message.type === "response.created") { responseActive.current = true; setStatus("speaking"); }
    if (message.type === "response.done") { responseActive.current = false; setStatus("listening"); setTranscripts((current) => current.map((item) => item.role === "agent" && !item.final ? { ...item, final: true } : item)); }
    if (message.type === "conversation.item.input_audio_transcription.completed" && message.transcript) { addFinal("user", message.transcript); void persistUser(message.transcript); }
    if (["response.output_audio_transcript.delta", "response.audio_transcript.delta"].includes(message.type ?? "")) addAgentDelta(message.delta ?? "");
    if (["response.output_audio_transcript.done", "response.audio_transcript.done"].includes(message.type ?? "") && message.transcript) addFinal("agent", message.transcript);
    if (message.type === "error") { end(); setError(message.error?.message ?? "Realtime connection error."); setStatus("error"); }
  }

  async function start() {
    if (status !== "idle" && status !== "error") return;
    setError(""); setTranscripts([]); setStatus("connecting");
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.current = microphone;
      const pc = new RTCPeerConnection(); peer.current = pc;
      microphone.getTracks().forEach((track) => pc.addTrack(track, microphone));
      pc.ontrack = (event) => { if (audio.current) { audio.current.srcObject = event.streams[0] ?? new MediaStream([event.track]); void audio.current.play().catch(() => undefined); } };
      pc.onconnectionstatechange = () => { if (["failed", "disconnected"].includes(pc.connectionState)) { end(); setError("Voice connection ended."); setStatus("error"); } };
      const dc = pc.createDataChannel("oai-events"); channel.current = dc; dc.addEventListener("message", handleServerEvent); dc.addEventListener("open", () => setStatus("listening"));
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      const response = await fetch("/api/v1/realtime/call", { method: "POST", headers: { "content-type": "application/sdp" }, body: offer.sdp });
      const result = await response.json() as { sdp?: string; conversationId?: string; error?: string };
      if (!response.ok || !result.sdp || !result.conversationId) throw new Error(result.error ?? "Could not start voice conversation.");
      conversationId.current = result.conversationId; await pc.setRemoteDescription({ type: "answer", sdp: result.sdp });
    } catch (cause) { end(); setError(cause instanceof Error ? cause.message : "Could not start voice conversation."); setStatus("error"); }
  }

  if (!open) return <audio ref={audio} autoPlay hidden />;
  return <div className={styles.backdrop} onPointerDown={(event) => { if (event.target === event.currentTarget && status === "idle") onClose(); }}>
    <section className={styles.panel} role="dialog" aria-modal="true" aria-label="Voice Agent">
      <header><div><strong>Agent</strong><small>Live voice · no tools</small></div><button type="button" aria-label="Close Agent" onClick={() => { end(); onClose(); }}>×</button></header>
      <div className={styles.status}><span className={styles[status]} />{status === "idle" ? "Ready" : status === "connecting" ? "Connecting…" : status === "listening" ? "Listening" : status === "speaking" ? "Agent speaking" : "Connection error"}</div>
      <div className={styles.chat} aria-live="polite">{transcripts.length ? transcripts.map((item) => <div key={item.id} className={item.role === "user" ? styles.user : styles.agent}><small>{item.role === "user" ? "You" : "Agent"}</small><p>{item.text}</p></div>) : <p className={styles.empty}>Start once, talk naturally, and interrupt whenever you need to.</p>}</div>
      {error && <p className={styles.error}>{error}</p>}
      <footer>{status === "idle" || status === "error" ? <button type="button" className={styles.start} onClick={() => void start()}>Start voice conversation</button> : <button type="button" className={styles.end} onClick={end}>End voice conversation</button>}</footer>
      <audio ref={audio} autoPlay hidden />
    </section>
  </div>;
}
