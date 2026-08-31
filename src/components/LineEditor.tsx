"use client";

import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { LiquidChromeOrb } from "@/ui";
import { wrapExternalText } from "@/lib/text-layout";
import { userStorageKey } from "@/lib/user-storage";
import { AO_WORKSPACE_LINE_COMMAND_EVENT, AO_WORKSPACE_LINE_COMMAND_KEY, type AOWorkspaceLineCommand } from "@/lib/ao-macro";

type BlockKind = "text" | "h1" | "h2" | "h3" | "h4" | "bullets" | "numbered" | "todo" | "code" | "quote";
type Line = { id: string; text: string; kind: BlockKind; comments: string[]; accent: boolean; align: "left" | "center" | "right" };

const makeLine = (text = ""): Line => ({ id: crypto.randomUUID(), text, kind: "text", comments: [], accent: false, align: "left" });

function markdownLines(value: string): Line[] {
  let inCodeBlock = false;
  const lines: Line[] = [];
  for (const raw of value.replace(/\r/g, "").split("\n")) {
    if (/^```/.test(raw.trim())) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) { lines.push({ ...makeLine(raw), kind: "code" }); continue; }
    const heading = raw.match(/^(#{1,4})\s+(.+)$/);
    if (heading) { lines.push({ ...makeLine(heading[2]!), kind: `h${heading[1]!.length}` as BlockKind }); continue; }
    const todo = raw.match(/^- \[([ xX])\]\s+(.+)$/);
    if (todo) { lines.push({ ...makeLine(todo[2]!), kind: "todo" }); continue; }
    const bullet = raw.match(/^[-*]\s+(.+)$/);
    if (bullet) { lines.push({ ...makeLine(bullet[1]!), kind: "bullets" }); continue; }
    const numbered = raw.match(/^\d+\.\s+(.+)$/);
    if (numbered) { lines.push({ ...makeLine(numbered[1]!), kind: "numbered" }); continue; }
    const quote = raw.match(/^>\s?(.+)$/);
    if (quote) { lines.push({ ...makeLine(quote[1]!), kind: "quote" }); continue; }
    lines.push(makeLine(raw));
  }
  return lines.length ? lines : [makeLine()];
}

function hasMarkdownStructure(value: string) { return /^(#{1,4}\s+|[-*]\s+|\d+\.\s+|- \[[ xX]\]\s+|>\s?|```)/m.test(value) || /\n\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*(?:\n|$)/.test(value); }

function Glyph({ children }: { children: React.ReactNode }) { return <span className="ms-menu-glyph" aria-hidden>{children}</span>; }

export function LineEditor({ value, onChange, storageKey, continuousSelection = false }: { value: string; onChange: (next: string) => void; storageKey: string; continuousSelection?: boolean }) {
  const [lines, setLines] = useState<Line[]>(() => markdownLines(value));
  const [active, setActive] = useState<string | null>(null);
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState("");
  const [hoveredContinuousLine, setHoveredContinuousLine] = useState<string | null>(null);
  const [continuousScrollTop, setContinuousScrollTop] = useState(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const editors = useRef<Record<string, HTMLDivElement | null>>({});
  const continuousTextarea = useRef<HTMLTextAreaElement | null>(null);
  const linesRef = useRef(lines);
  const joined = useMemo(() => lines.map((line) => line.text).join("\n"), [lines]);

  useEffect(() => {
    const base = markdownLines(value);
    try {
      const saved = JSON.parse(localStorage.getItem(userStorageKey(`work-sync:line-meta:${storageKey}`)) ?? "[]") as Partial<Line>[];
      const restored = base.map((line, i) => ({ ...line, kind: saved[i]?.kind ?? line.kind, comments: Array.isArray(saved[i]?.comments) ? saved[i]!.comments! : [], accent: saved[i]?.accent ?? false, align: saved[i]?.align ?? "left" })); linesRef.current = restored; setLines(restored);
    } catch { linesRef.current = base; setLines(base); }
    setLoadedKey(storageKey); setActive(null);
  }, [storageKey]);

  useEffect(() => {
    const currentJoined = (continuousSelection ? linesRef.current : lines).map((line) => line.text).join("\n");
    if (loadedKey === storageKey && value !== currentJoined) {
      const incoming = markdownLines(value); const normalized = incoming.map((line) => line.text).join("\n"); const structured = hasMarkdownStructure(value);
      const next = incoming.map((line, i) => {
        const previous = linesRef.current;
        const prior = previous[i];
        return structured ? line : prior ? { ...prior, ...(continuousSelection ? { id: crypto.randomUUID() } : {}), text: line.text } : line;
      }); linesRef.current = next; setLines(next);
      if (normalized !== value) onChange(normalized);
      setActive(null);
    }
  }, [value, joined, lines, loadedKey, storageKey, onChange, continuousSelection]);

  useEffect(() => {
    if (loadedKey === storageKey) localStorage.setItem(userStorageKey(`work-sync:line-meta:${storageKey}`), JSON.stringify(lines.map(({ kind, comments, accent, align }) => ({ kind, comments, accent, align }))));
  }, [lines, loadedKey, storageKey]);
  useEffect(() => {
    function consume() {
      const raw = localStorage.getItem(userStorageKey(AO_WORKSPACE_LINE_COMMAND_KEY)); if (!raw) return;
      localStorage.removeItem(userStorageKey(AO_WORKSPACE_LINE_COMMAND_KEY));
      try { const command = JSON.parse(raw) as AOWorkspaceLineCommand; const text = command.text.trim(); if (!text) return; const current = linesRef.current; if (command.action === "add-comment") { let at = 0; for (let index = current.length - 1; index >= 0; index -= 1) if (current[index]!.text.trim()) { at = index; break; } commit(current.map((line, index) => index === at ? { ...line, comments: [...line.comments, text] } : line)); return; } const kind: BlockKind = command.action === "add-code" ? "code" : command.action === "add-heading" ? command.kind ?? "h2" : "text"; commit([...current, ...text.split("\n").map((part) => ({ ...makeLine(part), kind }))]); } catch { /* ignore invalid macro input */ }
    }
    consume(); window.addEventListener(AO_WORKSPACE_LINE_COMMAND_EVENT, consume); return () => window.removeEventListener(AO_WORKSPACE_LINE_COMMAND_EVENT, consume);
  }, []);
  useEffect(() => {
    if (!active) return;
    function dismissLineMenu(event: PointerEvent) {
      if (event.target instanceof Element && (event.target.closest(".ms-line-menu") || event.target.closest(".ms-line-toggle"))) return;
      setActive(null); setCommenting(false);
    }
    document.addEventListener("pointerdown", dismissLineMenu);
    return () => document.removeEventListener("pointerdown", dismissLineMenu);
  }, [active]);

  function commit(next: Line[]) { linesRef.current = next; setLines(next); onChange(next.map((line) => line.text).join("\n")); }
  function update(id: string, patch: Partial<Line>) { if (continuousSelection && patch.text !== undefined && editors.current[id]) editors.current[id]!.textContent = patch.text; commit(linesRef.current.map((line) => line.id === id ? { ...line, ...patch } : line)); }
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
      // Formatting changes alter the visual line before the parent note state has
      // settled. A second frame restores the native caret against that finished
      // line, rather than the previous visual layout.
      requestAnimationFrame(() => {
        if (continuousSelection) { const textarea = continuousTextarea.current; const at = linesRef.current.findIndex((line) => line.id === id); if (!textarea || at < 0) return; const line = linesRef.current[at]!; const position = linesRef.current.slice(0, at).reduce((total, item) => total + item.text.length + 1, 0) + Math.min(Math.max(offset, 0), line.text.length); textarea.focus(); textarea.setSelectionRange(position, position); return; }
        const editor = editors.current[id]; if (!editor) return; editor.focus();
        const range = document.createRange(); const selection = window.getSelection(); const node = editor.firstChild ?? editor;
        range.setStart(node, Math.min(offset, node.textContent?.length ?? 0)); range.collapse(true); selection?.removeAllRanges(); selection?.addRange(range);
      });
    });
  }
  function insert(id: string, offset: -1 | 1) {
    const current = linesRef.current; const at = current.findIndex((line) => line.id === id); const fresh = makeLine(); const next = [...current];
    next.splice(at + (offset > 0 ? 1 : 0), 0, fresh); commit(next); setActive(null); focusSoon(fresh.id);
  }
  function remove(id: string) {
    const current = linesRef.current; if (current.length === 1) return update(id, { text: "" });
    const at = current.findIndex((line) => line.id === id); const next = current.filter((line) => line.id !== id); const target = next[Math.max(0, at - 1)]; commit(next); setActive(null); if (target) focusSoon(target.id);
  }
  function onKey(event: KeyboardEvent<HTMLDivElement>, line: Line, editor = event.currentTarget) {
    if (event.key === "Enter") {
      event.preventDefault(); const current = linesRef.current; const liveLine = current.find((item) => item.id === line.id) ?? line; const at = current.findIndex((item) => item.id === line.id); const { start, end } = selectionOffsets(editor); const fresh = makeLine(liveLine.text.slice(end)); const next = [...current]; next[at] = { ...liveLine, text: liveLine.text.slice(0, start) }; if (continuousSelection) editor.textContent = next[at]!.text; next.splice(at + 1, 0, fresh); commit(next); setActive(null); focusSoon(fresh.id, 0);
    }
    if (event.key === "Backspace") {
      const current = linesRef.current; const liveLine = current.find((item) => item.id === line.id) ?? line; const selection = selectionOffsets(editor); const at = current.findIndex((item) => item.id === line.id);
      if (selection.collapsed && selection.start === 0 && at > 0) {
        event.preventDefault(); const previous = current[at - 1]!;
        if (!previous.text) { const next = current.filter((item) => item.id !== previous.id); commit(next); focusSoon(liveLine.id, 0); }
        else { const joinAt = previous.text.length; const next = [...current]; next[at - 1] = { ...previous, text: previous.text + liveLine.text }; if (continuousSelection && editors.current[previous.id]) editors.current[previous.id]!.textContent = next[at - 1]!.text; next.splice(at, 1); commit(next); focusSoon(previous.id, joinAt); }
      }
    }
    if (event.key === "Escape") setActive(null);
  }
  function onPaste(event: ClipboardEvent<HTMLDivElement>, line: Line, editor = event.currentTarget) {
    const pasted = event.clipboardData.getData("text/plain"); if (!pasted) return;
    event.preventDefault(); const current = linesRef.current; const liveLine = current.find((item) => item.id === line.id) ?? line; const at = current.findIndex((item) => item.id === line.id); const selection = selectionOffsets(editor); const before = liveLine.text.slice(0, selection.start); const after = liveLine.text.slice(selection.end); const markdown = hasMarkdownStructure(pasted); const wrapped = markdown ? markdownLines(before + pasted + after) : wrapExternalText(pasted).map((text, index) => index === 0 ? { ...liveLine, text: before + text } : makeLine(text)); const replacement = markdown ? wrapped : wrapped.map((item) => item); replacement[replacement.length - 1] = { ...replacement[replacement.length - 1]!, text: replacement[replacement.length - 1]!.text + (markdown ? "" : after) }; if (continuousSelection) editor.textContent = replacement[0]!.text; const next = [...current]; next.splice(at, 1, ...replacement); commit(next); const target = replacement.at(-1)!; focusSoon(target.id, target.text.length - (markdown ? 0 : after.length));
  }
  function setKind(id: string, kind: BlockKind) { update(id, { kind }); setActive(null); if (kind === "h1" || kind === "h2" || kind === "h3" || kind === "h4") { const current = linesRef.current.find((line) => line.id === id); focusSoon(id, current?.text.length ?? 0); } }
  function addComment(line: Line) {
    const text = comment.trim(); if (!text) return;
    update(line.id, { comments: [...line.comments, text] }); setComment(""); setCommenting(false);
  }

  function updateContinuousValue(nextValue: string) { const texts = nextValue.split("\n"); const next = texts.map((text, index) => linesRef.current[index] ? { ...linesRef.current[index]!, text } : makeLine(text)); linesRef.current = next; setLines(next); onChange(nextValue); }
  function pasteMarkdown(valueWithPaste: string, caretAt: number) { const next = markdownLines(valueWithPaste); const normalized = next.map((line) => line.text).join("\n"); commit(next); requestAnimationFrame(() => { const textarea = continuousTextarea.current; if (!textarea) return; textarea.focus(); textarea.setSelectionRange(Math.min(caretAt, normalized.length), Math.min(caretAt, normalized.length)); }); }

  return <div className={`ms-line-editor${continuousSelection ? " is-continuous" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setActive(null); }}>
    {continuousSelection && <textarea ref={continuousTextarea} className="ms-continuous-textarea" aria-label="Continuous line editor" value={value} onChange={(event) => updateContinuousValue(event.target.value)} onMouseMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const index = Math.floor((event.clientY - rect.top + event.currentTarget.scrollTop - 4) / 27); setHoveredContinuousLine(linesRef.current[index]?.id ?? null); }} onMouseLeave={() => setHoveredContinuousLine(null)} onScroll={(event) => { setContinuousScrollTop(event.currentTarget.scrollTop); setHoveredContinuousLine(null); }} onPaste={(event) => { const textarea = event.currentTarget; const pasted = event.clipboardData.getData("text/plain"); if (!pasted) return; event.preventDefault(); const start = textarea.selectionStart; const end = textarea.selectionEnd; const nextValue = value.slice(0, start) + pasted + value.slice(end); if (hasMarkdownStructure(pasted)) pasteMarkdown(nextValue, start + markdownLines(pasted).map((line) => line.text).join("\n").length); else { const wrapped = wrapExternalText(pasted).join("\n"); updateContinuousValue(value.slice(0, start) + wrapped + value.slice(end)); requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(start + wrapped.length, start + wrapped.length); }); } }} wrap="off" placeholder="Write a note…" />}
    {lines.map((line, index) => <div className={`ms-editor-line ms-line-${line.kind}${line.accent ? " is-accent" : ""}${continuousSelection && hoveredContinuousLine === line.id ? " is-hovered" : ""}`} style={continuousSelection ? { position: "absolute", top: 6 + index * 27 - continuousScrollTop, left: 25, right: 4, pointerEvents: "none" } : undefined} key={line.id}>
      <button type="button" contentEditable={false} className={`ms-line-toggle${active === line.id ? " is-active" : ""}`} onClick={() => { setActive(active === line.id ? null : line.id); setCommenting(false); }} aria-label={`Actions for line ${index + 1}`}>⋮⋮</button>
      <span className="ms-line-prefix" contentEditable={false} aria-hidden>{line.kind === "bullets" ? "•" : line.kind === "numbered" ? `${index + 1}.` : line.kind === "todo" ? "□" : line.kind === "quote" ? "❞" : ""}</span>
      {continuousSelection && <span className="ms-line-display" style={{ textAlign: line.align }} aria-hidden>{line.text.startsWith("|") && line.text.endsWith("|") ? <span className={`ms-markdown-row${/^\|(?:\s*---\s*\|)+$/.test(line.text) ? " is-divider" : ""}`}>{line.text.slice(1, -1).split("|").map((cell, cellIndex) => <span key={cellIndex}>{cell.trim()}</span>)}</span> : line.text}</span>}
      {!continuousSelection && <div ref={(el) => { editors.current[line.id] = el; }} contentEditable suppressContentEditableWarning data-placeholder={index === 0 ? "Write a note…" : ""} onInput={(e) => update(line.id, { text: e.currentTarget.textContent ?? "" })} onKeyDown={(e) => onKey(e, line)} onPaste={(e) => onPaste(e, line)} style={{ textAlign: line.align }} aria-label={`Line ${index + 1}`}>{line.text}</div>}
      {line.comments.length > 0 && <button className="ms-comment-count" contentEditable={false} type="button" onClick={() => { setActive(line.id); setCommenting(true); }} title={line.comments.join("\n")}>▱ {line.comments.length}</button>}
      {active === line.id && <div className="ms-line-menu" contentEditable={false} role="menu">
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
