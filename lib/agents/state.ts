import fs from "fs";
import path from "path";

export interface AgentRuntimeState {
  lastMorningDate?: string;
  lastEveningDate?: string;
  lastTelegramOffset?: number;
}

const STATE_FILE_PATH = path.join(process.cwd(), "agents-state.json");

export function readAgentState(): AgentRuntimeState {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    }
  } catch (err) {
    console.warn("[Agent:State] Gagal membaca state:", err);
  }
  return {};
}

export function writeAgentState(patch: Partial<AgentRuntimeState>): void {
  try {
    const current = readAgentState();
    const next = { ...current, ...patch };
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(next, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Agent:State] Gagal menyimpan state:", err);
  }
}
