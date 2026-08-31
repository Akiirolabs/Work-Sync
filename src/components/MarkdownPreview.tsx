"use client";

import { Fragment, type ReactNode } from "react";

function inline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*]+\*|_[^_]+_|!?\[[^\]]*\]\([^\s)]+\))/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("~~") && part.endsWith("~~")) return <del key={index}>{part.slice(2, -2)}</del>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={index}>{part.slice(1, -1)}</em>;
    const image = part.match(/^!\[([^\]]*)\]\(([^\s)]+)\)$/);
    if (image) return <img key={index} src={image[2]} alt={image[1]} />;
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function tableCells(line: string) { return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()); }
const tableDivider = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;

export function MarkdownPreview({ value, className = "" }: { value: string; className?: string }) {
  const lines = value.replace(/\r/g, "").split("\n"); const output: ReactNode[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index]!;
    if (line.startsWith("```")) { const language = line.slice(3).trim(); const code: string[] = []; index += 1; while (index < lines.length && !lines[index]!.startsWith("```")) code.push(lines[index++]!); if (index < lines.length) index += 1; output.push(<pre className="ms-markdown-code" key={`code-${index}`}><small>{language || "code"}</small><code>{code.join("\n")}</code></pre>); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/); if (heading) { const Tag = `h${heading[1]!.length}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6"; output.push(<Tag key={`h-${index}`}>{inline(heading[2]!)}</Tag>); index += 1; continue; }
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) { output.push(<hr key={`hr-${index}`} />); index += 1; continue; }
    if (line.includes("|") && tableDivider.test(lines[index + 1] ?? "")) { const headers = tableCells(line); index += 2; const rows: string[][] = []; while (index < lines.length && lines[index]!.includes("|")) rows.push(tableCells(lines[index++]!)); output.push(<div className="ms-markdown-table" tabIndex={0} key={`table-${index}`}><table><thead><tr>{headers.map((header, cellIndex) => <th key={cellIndex}>{inline(header)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex}>{inline(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody></table></div>); continue; }
    if (/^- \[[ xX]\]\s+/.test(line)) { const items: Array<{ text: string; checked: boolean }> = []; while (index < lines.length && /^- \[[ xX]\]\s+/.test(lines[index]!)) { const item = lines[index++]!.match(/^- \[([ xX])\]\s+(.+)$/)!; items.push({ checked: item[1]!.toLowerCase() === "x", text: item[2]! }); } output.push(<ul className="ms-markdown-tasks" key={`tasks-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}><input type="checkbox" checked={item.checked} readOnly aria-label={`${item.checked ? "Completed" : "Open"}: ${item.text}`} />{inline(item.text)}</li>)}</ul>); continue; }
    if (/^[-*]\s+/.test(line)) { const items: string[] = []; while (index < lines.length && /^[-*]\s+/.test(lines[index]!)) items.push(lines[index++]!.replace(/^[-*]\s+/, "")); output.push(<ul key={`ul-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>); continue; }
    if (/^\d+\.\s+/.test(line)) { const items: string[] = []; while (index < lines.length && /^\d+\.\s+/.test(lines[index]!)) items.push(lines[index++]!.replace(/^\d+\.\s+/, "")); output.push(<ol key={`ol-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ol>); continue; }
    if (line.startsWith("> ")) { output.push(<blockquote key={`q-${index}`}>{inline(line.slice(2))}</blockquote>); index += 1; continue; }
    if (!line.trim()) { index += 1; continue; }
    output.push(<p key={`p-${index}`}>{inline(line)}</p>); index += 1;
  }
  return <div className={`ms-markdown ${className}`}>{output}</div>;
}
