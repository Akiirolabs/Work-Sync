"use client";

import { Workspace } from "@/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client-api";

type Source = { id: string; name: string; topicTag: string; status: string };

type Finding = {
  id: string;
  analyzerId: string;
  title: string;
  severity: string;
  confidence: number;
  explanation: string;
  evidence: { metric: string; detail: string; value?: number }[];
  recommendedFixes: { id: string; title: string; summary: string; actions: string[] }[];
};

type Diagnosis = {
  sourceId: string;
  analyzedAt: string;
  findingCount: number;
  findings: Finding[];
};

const SAMPLE_CSV = `claim,expires_at,evidence_pointer
Onboarding FAQ is current,2026-01-01,docs/faq.md
API rate limit is 100 req/min,2025-06-01,
Use Postgres for the ledger,2026-12-31,adr/0001.md
Staging URL is still valid,2024-01-01,https://staging.example.invalid`;

export default function VerifyPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [claimsText, setClaimsText] = useState(SAMPLE_CSV);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSources = useCallback(async () => {
    const list = await api<Source[]>("/api/v1/sources");
    setSources(list);
    const stored = localStorage.getItem("knowledge:active-source");
    if (stored && list.some((r) => r.id === stored)) {
      setSourceId(stored);
    } else if (list[0]) {
      setSourceId(list[0].id);
    }
  }, []);

  useEffect(() => {
    void loadSources().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [loadSources]);

  useEffect(() => {
    if (sourceId) localStorage.setItem("knowledge:active-source", sourceId);
  }, [sourceId]);

  const activeSource = useMemo(
    () => sources.find((r) => r.id === sourceId),
    [sources, sourceId],
  );

  async function ingestAndVerify() {
    if (!sourceId) {
      setError("Create a source first");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api(`/api/v1/sources/${sourceId}/claims`, {
        method: "POST",
        body: JSON.stringify({ text: claimsText }),
      });
      const result = await api<Diagnosis>(`/api/v1/sources/${sourceId}/verify`, {
        method: "POST",
      });
      setDiagnosis(result);
      setMessage(`Verified ${result.findingCount} finding(s)`);
      await loadSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verify failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyFix(finding: Finding, fixId: string) {
    try {
      await api(`/api/v1/sources/${sourceId}/fixes`, {
        method: "POST",
        body: JSON.stringify({ findingId: finding.id, fixId, status: "applied" }),
      });
      setMessage(`Applied fix and wrote documentation to history`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed");
    }
  }

  return (
    <Workspace
      title="Verify"
      subtitle={activeSource ? `${activeSource.name} · ${activeSource.topicTag}` : "Select a source"}
      actions={
        <button className="ms-btn ms-btn-primary" type="button" disabled={busy} onClick={() => void ingestAndVerify()}>
          {busy ? "Working…" : "Ingest + verify"}
        </button>
      }
    >
      <div className="ms-grid-2">
        <div className="ms-stack">
          <div className="ms-panel">
            <h2 className="ms-panel-title">Source</h2>
            <select
              className="ms-select"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              {sources.length === 0 ? <option value="">No sources</option> : null}
              {sources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.status})
                </option>
              ))}
            </select>
          </div>
          <div className="ms-panel">
            <h2 className="ms-panel-title">Claims (CSV / JSON)</h2>
            <textarea
              className="ms-textarea"
              style={{ minHeight: 220, maxWidth: "100%" }}
              value={claimsText}
              onChange={(e) => setClaimsText(e.target.value)}
              spellCheck={false}
            />
            <p className="ms-muted ms-mono" style={{ marginTop: 6 }}>
              Sample includes expired + missing evidence pointers
            </p>
          </div>
          {error ? <p className="ms-sev-critical">{error}</p> : null}
          {message ? <p className="ms-muted">{message}</p> : null}
        </div>

        <div className="ms-panel" style={{ overflow: "auto" }}>
          <h2 className="ms-panel-title">Findings</h2>
          {!diagnosis ? (
            <p className="ms-muted">Run ingest + verify to populate this canvas.</p>
          ) : diagnosis.findings.length === 0 ? (
            <p className="ms-muted">No issues detected for this series.</p>
          ) : (
            diagnosis.findings.map((f) => (
              <article key={f.id} className="ms-finding">
                <div className="ms-row">
                  <strong>{f.title}</strong>
                  <span className={`ms-sev-${f.severity}`}>{f.severity}</span>
                  <span className="ms-mono ms-muted">
                    {(f.confidence * 100).toFixed(0)}% · {f.analyzerId}
                  </span>
                </div>
                <p style={{ margin: "6px 0", maxWidth: 720 }}>{f.explanation}</p>
                <ul className="ms-mono ms-muted" style={{ margin: "0 0 8px", paddingLeft: 16 }}>
                  {f.evidence.map((e, i) => (
                    <li key={`${f.id}-${i}`}>
                      {e.metric}: {e.detail}
                      {e.value !== undefined ? ` (${e.value})` : ""}
                    </li>
                  ))}
                </ul>
                <div className="ms-stack">
                  {f.recommendedFixes.map((fix) => (
                    <div key={fix.id} className="ms-row">
                      <span>{fix.title}</span>
                      <button
                        type="button"
                        className="ms-btn"
                        onClick={() => void applyFix(f, fix.id)}
                      >
                        Apply + document
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </Workspace>
  );
}
