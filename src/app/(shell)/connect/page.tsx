"use client";

import { DataTable, Workspace } from "@/ui";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";

type ConnectorInfo = {
  id: string;
  label: string;
  status: string;
  description: string;
};

export default function ConnectPage() {
  const [rows, setRows] = useState<ConnectorInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<ConnectorInfo[]>("/api/v1/connectors")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <Workspace
      title="Connect"
      subtitle="Pluggable evidence pointers — file ready; folder & URL stubs"
    >
      {error ? <p className="ms-sev-critical">{error}</p> : null}
      <div className="ms-panel">
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          emptyMessage="No connectors registered."
          columns={[
            { key: "label", header: "Connector", render: (r) => r.label },
            { key: "id", header: "Id", render: (r) => r.id },
            { key: "status", header: "Status", render: (r) => r.status },
            { key: "desc", header: "Notes", render: (r) => r.description },
          ]}
        />
      </div>
      <p className="ms-muted" style={{ marginTop: 12, maxWidth: 640 }}>
        Pointers stay as paths or URLs you already have. This console does not copy vaults.
      </p>
    </Workspace>
  );
}
