export type SourceRow = {
  id: string;
  user_id: string | null;
  name: string;
  topic_tag: string;
  workspace_note_id: string | null;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ClaimsRow = {
  source_id: string;
  series_json: string;
  source: string;
  ingested_at: string;
};

export type VerificationRow = {
  source_id: string;
  result_json: string;
  analyzed_at: string;
};

export type HistoryEventRow = {
  id: string;
  source_id: string;
  type: string;
  message: string;
  payload_json: string;
  created_at: string;
};

export type FixDocumentRow = {
  id: string;
  source_id: string;
  finding_id: string;
  fix_id: string;
  title: string;
  body_markdown: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ApiKeyRow = {
  id: string;
  label: string;
  key_hash: string;
  created_at: string;
  revoked_at: string | null;
};

export type RateLimitRow = {
  key: string;
  count: number;
  window_start: number;
};

export type WorkspaceNoteRow = {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type UserStateRow = {
  user_id: string;
  state_json: string;
  updated_at: string;
};
