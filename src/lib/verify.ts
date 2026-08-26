import type { ClaimRow } from "./ingest";

export type RecommendedFix = {
  id: string;
  title: string;
  summary: string;
  actions: string[];
};

export type Finding = {
  id: string;
  analyzerId: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  confidence: number;
  explanation: string;
  evidence: { metric: string; detail: string; value?: number }[];
  recommendedFixes: RecommendedFix[];
};

export type VerifyResult = {
  sourceId: string;
  analyzedAt: string;
  findingCount: number;
  findings: Finding[];
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function attachEvidenceFix(claim: string): RecommendedFix {
  return {
    id: "attach-pointer",
    title: "Attach evidence pointer",
    summary: `Point this claim at an existing file, folder, or URL. Do not paste the body into the vault.`,
    actions: [
      `Find the source of truth for: ${claim}`,
      "Add the path or URL in the claims CSV evidence_pointer column",
      "Re-run ingest + verify",
    ],
  };
}

function refreshExpiryFix(claim: string): RecommendedFix {
  return {
    id: "refresh-expiry",
    title: "Set a new expiry",
    summary: `Re-check the claim and write a date when it should be verified again.`,
    actions: [
      `Re-read the source for: ${claim}`,
      "Update expires_at in the CSV",
      "Re-run ingest + verify",
    ],
  };
}

function supersedeFix(claim: string): RecommendedFix {
  return {
    id: "mark-superseded",
    title: "Mark superseded",
    summary: `This claim is no longer the answer. Record that in history and stop treating it as current.`,
    actions: [
      `Write what replaced: ${claim}`,
      "Keep the old pointer for audit",
      "Create a new claim row for the replacement",
    ],
  };
}

export function runVerify(sourceId: string, claims: ClaimRow[], now = new Date()): VerifyResult {
  const findings: Finding[] = [];
  const nowMs = now.getTime();

  claims.forEach((row, index) => {
    const pointer = row.evidencePointer.trim();
    const expiresMs = row.expiresAt ? Date.parse(row.expiresAt) : Number.NaN;

    if (!pointer) {
      findings.push({
        id: `unverified-${index}`,
        analyzerId: "missing-pointer",
        title: `Unverified: ${row.claim}`,
        severity: "high",
        confidence: 0.95,
        explanation:
          "This claim has no file, folder, or URL pointer. It is an unsourced answer and will rot.",
        evidence: [{ metric: "evidence_pointer", detail: "empty" }],
        recommendedFixes: [attachEvidenceFix(row.claim), supersedeFix(row.claim)],
      });
    }

    if (row.expiresAt && Number.isNaN(expiresMs)) {
      findings.push({
        id: `bad-date-${index}`,
        analyzerId: "expiry-parse",
        title: `Unreadable expiry: ${row.claim}`,
        severity: "medium",
        confidence: 0.9,
        explanation: `expires_at "${row.expiresAt}" is not a date. Use ISO (YYYY-MM-DD).`,
        evidence: [{ metric: "expires_at", detail: row.expiresAt }],
        recommendedFixes: [refreshExpiryFix(row.claim)],
      });
      return;
    }

    if (!Number.isNaN(expiresMs) && expiresMs < nowMs) {
      findings.push({
        id: `expired-${index}`,
        analyzerId: "expired-claim",
        title: `Expired: ${row.claim}`,
        severity: "critical",
        confidence: 0.99,
        explanation:
          "The trust window for this claim has passed. Treat it as debt until someone re-checks the pointer.",
        evidence: [
          { metric: "expires_at", detail: row.expiresAt ?? "" },
          { metric: "evidence_pointer", detail: pointer || "(none)" },
        ],
        recommendedFixes: [refreshExpiryFix(row.claim), supersedeFix(row.claim)],
      });
    } else if (!Number.isNaN(expiresMs) && expiresMs - nowMs <= WEEK_MS) {
      findings.push({
        id: `expiring-${index}`,
        analyzerId: "expiring-claim",
        title: `Expiring: ${row.claim}`,
        severity: "medium",
        confidence: 0.85,
        explanation: "This claim expires within 7 days. Verify the pointer before it goes stale.",
        evidence: [{ metric: "expires_at", detail: row.expiresAt ?? "" }],
        recommendedFixes: [refreshExpiryFix(row.claim)],
      });
    }
  });

  return {
    sourceId,
    analyzedAt: now.toISOString(),
    findingCount: findings.length,
    findings,
  };
}
