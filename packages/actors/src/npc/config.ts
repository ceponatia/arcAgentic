const DEFAULT_NPC_COGNITION_TIMEOUT_MS = 20_000;

const parsedNpcDecisionTimeoutMs = Number.parseInt(
  process.env['NPC_COGNITION_TIMEOUT_MS'] ?? String(DEFAULT_NPC_COGNITION_TIMEOUT_MS),
  10
);

export const NPC_DECISION_TIMEOUT_MS = Number.isFinite(parsedNpcDecisionTimeoutMs)
  ? parsedNpcDecisionTimeoutMs
  : DEFAULT_NPC_COGNITION_TIMEOUT_MS;
