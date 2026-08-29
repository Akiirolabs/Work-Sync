"use client";

import { DataTable, Workspace } from "@/ui";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { userStorageKey } from "@/lib/user-storage";

type Source = {
  id: string;
  name: string;
  topicTag: string;
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function SourcesPage() {
  const [rows, setRows] = useState<Source[]>([]);
  const [name, setName] = useState("");
  const [topicTag, setTopicTag] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await api<Source[]>("/api/v1/sources"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createSource(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/v1/sources", {
        method: "POST",
        body: JSON.stringify({ name, topicTag, notes }),
      });
      setName("");
      setTopicTag("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace title="Sources" subtitle="Create and select knowledge topics">
      <div className="ms-grid-2">
        <form className="ms-panel" onSubmit={createSource}>
          <h2 className="ms-panel-title">New source</h2>
          <div className="ms-field">
            <label className="ms-label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className="ms-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div className="ms-field">
            <label className="ms-label" htmlFor="tag">
              Topic tag
            </label>
            <input
              id="tag"
              className="ms-input"
              value={topicTag}
              onChange={(e) => setTopicTag(e.target.value)}
              required
              maxLength={120}
              placeholder="e.g. onboarding-faq"
            />
          </div>
          <div className="ms-field">
            <label className="ms-label" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              className="ms-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={4000}
            />
          </div>
          {error ? <p className="ms-sev-critical">{error}</p> : null}
          <button className="ms-btn ms-btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create source"}
          </button>
        </form>

        <div className="ms-panel">
          <h2 className="ms-panel-title">All sources</h2>
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            emptyMessage="No sources yet — create one on the left."
            columns={[
              { key: "name", header: "Name", render: (r) => r.name },
              { key: "tag", header: "Topic", render: (r) => r.topicTag },
              { key: "status", header: "Status", render: (r) => r.status },
              {
                key: "updated",
                header: "Updated",
                render: (r) => new Date(r.updatedAt).toLocaleString(),
              },
              {
                key: "id",
                header: "Id",
                render: (r) => (
                  <button
                    type="button"
                    className="ms-btn"
                    onClick={() => {
                      localStorage.setItem(userStorageKey("knowledge:active-source"), r.id);
                      window.location.href = "/verify";
                    }}
                  >
                    Open
                  </button>
                ),
              },
            ]}
          />
        </div>
      </div>
    </Workspace>
  );
}
