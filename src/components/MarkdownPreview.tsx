"use client";

import { Fragment, type ReactNode } from "react";

function inline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\))/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function MarkdownPreview({ value, className = "" }: { value: string; className?: string }) {
  const lines = value.replace(/\r/g, "").split("\n"); const output: ReactNode[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index]!;
    if (line.startsWith("```")) { const language = line.slice(3).trim(); const code: string[] = []; index += 1; while (index < lines.length && !lines[index]!.startsWith("```")) code.push(lines[index++]!); if (index < lines.length) index += 1; output.push(<pre className="ms-markdown-code" key={`code-${index}`}><small>{language || "code"}</small><code>{code.join("\n")}</code></pre>); continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/); if (heading) { const Tag = `h${heading[1]!.length}` as "h1" | "h2" | "h3" | "h4"; output.push(<Tag key={`h-${index}`}>{inline(heading[2]!)}</Tag>); index += 1; continue; }
    if (/^[-*]\s+/.test(line)) { const items: string[] = []; while (index < lines.length && /^[-*]\s+/.test(lines[index]!)) items.push(lines[index++]!.replace(/^[-*]\s+/, "")); output.push(<ul key={`ul-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>); continue; }
    if (/^\d+\.\s+/.test(line)) { const items: string[] = []; while (index < lines.length && /^\d+\.\s+/.test(lines[index]!)) items.push(lines[index++]!.replace(/^\d+\.\s+/, "")); output.push(<ol key={`ol-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ol>); continue; }
    if (line.startsWith("> ")) { output.push(<blockquote key={`q-${index}`}>{inline(line.slice(2))}</blockquote>); index += 1; continue; }
    if (!line.trim()) { index += 1; continue; }
    output.push(<p key={`p-${index}`}>{inline(line)}</p>); index += 1;
  }
  return <div className={`ms-markdown ${className}`}>{output}</div>;
}
