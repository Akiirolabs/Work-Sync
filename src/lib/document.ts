import type { Finding, RecommendedFix } from "./verify";

export function documentFix(input: {
  sourceId: string;
  finding: Finding;
  fix: RecommendedFix;
  status: "applied" | "dismissed";
}) {
  const createdAt = new Date().toISOString();
  const actions = input.fix.actions.map((a) => `- ${a}`).join("\n");
  return {
    id: crypto.randomUUID(),
    sourceId: input.sourceId,
    findingId: input.finding.id,
    fixId: input.fix.id,
    title: input.fix.title,
    bodyMarkdown: `# ${input.fix.title}

**Status:** ${input.status}
**Finding:** ${input.finding.title}
**Severity:** ${input.finding.severity}

${input.fix.summary}

## Why

${input.finding.explanation}

## Actions

${actions}
`,
    status: input.status,
    createdAt,
    updatedAt: createdAt,
  };
}
