export type AgentRole = 'designer' | 'exec1' | 'exec2' | 'exec3' | 'exec4' | 'exec5'

export function getGeminiKey(role: AgentRole): string | null {
  const map: Record<AgentRole, string | undefined> = {
    designer: process.env.GEMINI_API_KEY_PLAN_DESIGNER,
    exec1: process.env.GEMINI_API_KEY_1,
    exec2: process.env.GEMINI_API_KEY_2,
    exec3: process.env.GEMINI_API_KEY_3,
    exec4: process.env.GEMINI_API_KEY_4,
    exec5: process.env.GEMINI_API_KEY_5,
  }
  return map[role] || null
}

export function getModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash'
}
