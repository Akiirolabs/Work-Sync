"use client";

import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { LiquidChromeOrb } from "@/ui";
import { wrapExternalText } from "@/lib/text-layout";

type BlockKind = "text" | "h1" | "h2" | "h3" | "h4" | "bullets" | "numbered" | "todo" | "code" | "quote";
type Line = { id: string; text: string; kind: BlockKind; comments: string[]; accent: boolean; align: "left" | "center" | "right" };

const makeLine = (text = ""): Line => ({ id: crypto.randomUUID(), text, kind: "text", comments: [], accent: false, align: "left" });

function Glyph({ children }: { children: React.ReactNode }) { return <span className="ms-menu-glyph" aria-hidden>{children}</span>; }

export function LineEditor({ value, onChange, storageKey }: { value: string; onChange: (next: string) => void; storageKey: string }) {
  const [lines, setLines] = useState<Line[]>(() => value.split("\n").map(makeLine));
  const [active, setActive] = useState<string | null>(null);
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const editors = useRef<Record<string, HTMLDivElement | null>>({});
  const joined = useMemo(() => lines.map((line) => line.text).join("\n"), [lines]);

  useEffect(() => {
    const base = value.split("\n").map(makeLine);
    try {
      const saved = JSON.parse(localStorage.getItem(`work-sync:line-meta:${storageKey}`) ?? "[]") as Partial<Line>[];
      setLines(base.map((line, i) => ({ ...line, kind: saved[i]?.kind ?? line.kind, comments: Array.isArray(saved[i]?.comments) ? saved[i]!.comments! : [], accent: saved[i]?.accent ?? false, align: saved[i]?.align ?? "left" })));
    } catch { setLines(base); }
    setLoadedKey(storageKey); setActive(null);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey === storageKey && value !== joined) {
      const wrapped = wrapExternalText(value); const normalized = wrapped.join("\n");
      setLines((previous) => wrapped.map((text, i) => {
        const prior = previous[i];
        return prior ? { ...prior, text } : makeLine(text);
      }));
      if (normalized !== value) onChange(normalized);
      setActive(null);
    }
  }, [value, joined, loadedKey, storageKey, onChange]);

  useEffect(() => {
    if (loadedKey === storageKey) localStorage.setItem(`work-sync:line-meta:${storageKey}`, JSON.stringify(lines.map(({ kind, comments, accent, align }) => ({ kind, comments, accent, align }))));
  }, [lines, loadedKey, storageKey]);
  useEffect(() => {
    if (!active) return;
    function dismissLineMenu(event: PointerEvent) {
      if (event.target instanceof Element && (event.target.closest(".ms-line-menu") || event.target.closest(".ms-line-toggle"))) return;
      setActive(null); setCommenting(false);
    }
    document.addEventListener("pointerdown", dismissLineMenu);
    return () => document.removeEventListener("pointerdown", dismissLineMenu);
  }, [active]);

  function commit(next: Line[]) { setLines(next); onChange(next.map((line) => line.text).join("\n")); }
  function update(id: string, patch: Partial<Line>) { commit(lines.map((line) => line.id === id ? { ...line, ...patch } : line)); }
  function selectionOffsets(editor: HTMLDivElement) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return { start: editor.textContent?.length ?? 0, end: editor.textContent?.length ?? 0, collapsed: true };
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return { start: editor.textContent?.length ?? 0, end: editor.textContent?.length ?? 0, collapsed: true };
    const start = range.cloneRange(); const end = range.cloneRange();
    start.selectNodeContents(editor); start.setEnd(range.startContainer, range.startOffset);
    end.selectNodeContents(editor); end.setEnd(range.endContainer, range.endOffset);
    return { start: start.toString().length, end: end.toString().length, collapsed: range.collapsed };
  }
  function focusSoon(id: string, offset = 0) {
    requestAnimationFrame(() => {
      const editor = editors.current[id]; if (!editor) return; editor.focus();
      const range = document.createRange(); const selection = window.getSelection(); const node = editor.firstChild ?? editor;
      range.setStart(node, Math.min(offset, node.textContent?.length ?? 0)); range.collapse(true); selection?.removeAllRanges(); selection?.addRange(range);
    });
  }
  function insert(id: string, offset: -1 | 1) {
    const at = lines.findIndex((line) => line.id === id); const fresh = makeLine(); const next = [...lines];
    next.splice(at + (offset > 0 ? 1 : 0), 0, fresh); commit(next); setActive(null); focusSoon(fresh.id);
  }
  function remove(id: string) {
    if (lines.length === 1) return update(id, { text: "" });
    const at = lines.findIndex((line) => line.id === id); const next = lines.filter((line) => line.id !== id); const target = next[Math.max(0, at - 1)]; commit(next); setActive(null); if (target) focusSoon(target.id);
  }
  function onKey(event: KeyboardEvent<HTMLDivElement>, line: Line) {
    if (event.key === "Enter") {
      event.preventDefault(); const at = lines.findIndex((item) => item.id === line.id); const { start, end } = selectionOffsets(event.currentTarget); const fresh = makeLine(line.text.slice(end)); const next = [...lines]; next[at] = { ...line, text: line.text.slice(0, start) }; next.splice(at + 1, 0, fresh); commit(next); setActive(null); focusSoon(fresh.id, 0);
    }
    if (event.key === "Backspace") {
      const selection = selectionOffsets(event.currentTarget); const at = lines.findIndex((item) => item.id === line.id);
      if (selection.collapsed && selection.start === 0 && at > 0) {
        event.preventDefault(); const previous = lines[at - 1]!;
        if (!previous.text) { const next = lines.filter((item) => item.id !== previous.id); commit(next); focusSoon(line.id, 0); }
        else { const joinAt = previous.text.length; const next = [...lines]; next[at - 1] = { ...previous, text: previous.text + line.text }; next.splice(at, 1); commit(next); focusSoon(previous.id, joinAt); }
      }
    }
    if (event.key === "Escape") setActive(null);
  }
  function onPaste(event: ClipboardEvent<HTMLDivElement>, line: Line) {
    const pasted = event.clipboardData.getData("text/plain"); if (!pasted) return;
    event.preventDefault(); const at = lines.findIndex((item) => item.id === line.id); const selection = selectionOffsets(event.currentTarget); const before = line.text.slice(0, selection.start); const after = line.text.slice(selection.end); const wrapped = wrapExternalText(pasted); const replacement = wrapped.map((text, index) => index === 0 ? { ...line, text: before + text } : makeLine(text)); replacement[replacement.length - 1] = { ...replacement[replacement.length - 1]!, text: replacement[replacement.length - 1]!.text + after }; const next = [...lines]; next.splice(at, 1, ...replacement); commit(next); const target = replacement.at(-1)!; focusSoon(target.id, target.text.length - after.length);
  }
  function setKind(id: string, kind: BlockKind) { update(id, { kind }); setActive(null); }
  function addComment(line: Line) {
    const text = comment.trim(); if (!text) return;
    update(line.id, { comments: [...line.comments, text] }); setComment(""); setCommenting(false);
  }

  return <div className="ms-line-editor" onClick={(e) => { if (e.target === e.currentTarget) setActive(null); }}>
    {lines.map((line, index) => <div className={`ms-editor-line ms-line-${line.kind}${line.accent ? " is-accent" : ""}`} key={line.id}>
      <button type="button" className={`ms-line-toggle${active === line.id ? " is-active" : ""}`} onClick={() => { setActive(active === line.id ? null : line.id); setCommenting(false); }} aria-label={`Actions for line ${index + 1}`}>⋮⋮</button>
      <span className="ms-line-prefix" aria-hidden>{line.kind === "bullets" ? "•" : line.kind === "numbered" ? `${index + 1}.` : line.kind === "todo" ? "□" : line.kind === "quote" ? "❞" : ""}</span>
      <div ref={(el) => { editors.current[line.id] = el; }} contentEditable suppressContentEditableWarning data-placeholder={index === 0 ? "Write a note…" : ""} onInput={(e) => update(line.id, { text: e.currentTarget.textContent ?? "" })} onKeyDown={(e) => onKey(e, line)} onPaste={(e) => onPaste(e, line)} style={{ textAlign: line.align }} aria-label={`Line ${index + 1}`}>{line.text}</div>
      {line.comments.length > 0 && <button className="ms-comment-count" type="button" onClick={() => { setActive(line.id); setCommenting(true); }} title={line.comments.join("\n")}>▱ {line.comments.length}</button>}
      {active === line.id && <div className="ms-line-menu" role="menu">
        <button className="ms-menu-item ms-menu-ask" onClick={() => setActive(null)}><span className="ms-menu-glyph"><LiquidChromeOrb size={16} title="Ask AI" /></span><span>Ask AI</span><span className="ms-menu-chevron">›</span></button>
        <div className="ms-menu-rule" /><p className="ms-menu-label">Turn into</p>
        <div className="ms-turn-grid">
          {([['text','T'],['h1','H1'],['h2','H2'],['h3','H3'],['h4','H4'],['bullets','•≡'],['numbered','1≡'],['todo','☑'],['code','‹/›'],['quote','❞']] as [BlockKind,string][]).map(([kind,label]) => <button key={kind} className={line.kind === kind ? "is-active" : ""} onClick={() => setKind(line.id, kind)} title={kind}>{label}</button>)}
        </div>
        <div className="ms-menu-rule" />
        <button className="ms-menu-item" onClick={() => update(line.id, { accent: !line.accent })}><Glyph>♢</Glyph><span>Color</span><span className="ms-menu-chevron">›</span></button>
        <button className="ms-menu-item" onClick={() => update(line.id, { align: line.align === "left" ? "center" : line.align === "center" ? "right" : "left" })}><Glyph>≡</Glyph><span>Alignment &amp; indent</span><span className="ms-menu-chevron">›</span></button>
        <div className="ms-menu-rule" />
        <button className="ms-menu-item" onClick={() => { void navigator.clipboard.writeText(`${location.href}#line-${index + 1}`); setActive(null); }}><Glyph>↗</Glyph><span>Copy link</span></button>
        <button className="ms-menu-item" onClick={() => setCommenting(!commenting)}><Glyph>▱</Glyph><span>Comment</span>{line.comments.length > 0 && <em>{line.comments.length}</em>}</button>
        {commenting && <div className="ms-comment-box">
          {line.comments.map((item, i) => <p key={i}>{item}</p>)}
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" autoFocus />
          <div><button onClick={() => setCommenting(false)}>Cancel</button><button className="is-primary" onClick={() => addComment(line)}>Comment</button></div>
        </div>}
        <button className="ms-menu-item" onClick={() => setActive(null)}><Glyph>⌁</Glyph><span>Suggest edits</span></button>
        <button className="ms-menu-item" onClick={() => { update(line.id, { text: `${line.text} [citation]` }); setActive(null); }}><Glyph>①</Glyph><span>Citation</span></button>
        <div className="ms-menu-rule" />
        <button className="ms-menu-item" onClick={() => insert(line.id, -1)}><Glyph>↑</Glyph><span>Insert above</span></button>
        <button className="ms-menu-item" onClick={() => insert(line.id, 1)}><Glyph>↓</Glyph><span>Insert below</span></button>
        <button className="ms-menu-item" onClick={() => { void navigator.clipboard.writeText(line.text); setActive(null); }}><Glyph>▣</Glyph><span>Copy</span></button>
        <button className="ms-menu-item is-danger" onClick={() => remove(line.id)}><Glyph>♜</Glyph><span>Delete</span></button>
        <div className="ms-menu-rule" /><p className="ms-menu-meta">Line {index + 1} · edited just now</p>
      </div>}
    </div>)}
  </div>;
}
