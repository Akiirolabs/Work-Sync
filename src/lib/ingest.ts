export type ClaimRow = {
  claim: string;
  expiresAt: string | null;
  evidencePointer: string;
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

export function assertWithinByteLimit(bytes: number, maxBytes: number): void {
  if (bytes > maxBytes) {
    throw new Error(`Payload exceeds ${maxBytes} bytes`);
  }
}

export function parseClaimsText(text: string): ClaimRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  if (lines.length === 0) {
    throw new Error("No claim rows");
  }

  const header = splitCsvLine(lines[0] ?? "").map((h) => h.toLowerCase());
  const isCsv = header.includes("claim");
  const rows = isCsv ? lines.slice(1) : lines;

  return rows.map((line) => {
    if (line.startsWith("{")) {
      const obj = JSON.parse(line) as {
        claim?: string;
        expiresAt?: string;
        expires_at?: string;
        evidencePointer?: string;
        evidence_pointer?: string;
      };
      const claim = obj.claim?.trim() ?? "";
      if (!claim) throw new Error("JSON row missing claim");
      return {
        claim,
        expiresAt: obj.expiresAt ?? obj.expires_at ?? null,
        evidencePointer: obj.evidencePointer ?? obj.evidence_pointer ?? "",
      };
    }

    const cols = splitCsvLine(line);
    if (isCsv) {
      const claimIdx = header.indexOf("claim");
      const expIdx = header.indexOf("expires_at") >= 0 ? header.indexOf("expires_at") : header.indexOf("expiresat");
      const evIdx =
        header.indexOf("evidence_pointer") >= 0
          ? header.indexOf("evidence_pointer")
          : header.indexOf("evidence");
      const claim = (cols[claimIdx] ?? "").trim();
      if (!claim) throw new Error("CSV row missing claim");
      return {
        claim,
        expiresAt: (cols[expIdx] ?? "").trim() || null,
        evidencePointer: (cols[evIdx] ?? "").trim(),
      };
    }

    return {
      claim: cols[0] ?? "",
      expiresAt: cols[1] || null,
      evidencePointer: cols[2] ?? "",
    };
  });
}
