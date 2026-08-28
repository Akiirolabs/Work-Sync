export function wrapExternalText(text: string, limit = 92): string[] {
  return text.split(/\r?\n/).flatMap((source) => {
    if (!source || source.length <= limit) return [source];
    const lines: string[] = []; let rest = source;
    while (rest.length > limit) {
      let cut = rest.lastIndexOf(" ", limit); if (cut < Math.floor(limit * .55)) cut = limit;
      lines.push(rest.slice(0, cut).trimEnd()); rest = rest.slice(cut).trimStart();
    }
    lines.push(rest); return lines;
  });
}

export function wrapExternalValue(text: string, limit = 92): string { return wrapExternalText(text, limit).join("\n"); }
