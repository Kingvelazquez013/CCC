import { getEnabledAgents, type Agent } from "./agents";

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Select the best available agent for a task.
 *
 * Scoring:
 *  +10  department match
 *  +5   business match
 *  +1   generalist (empty departments = handles anything)
 *
 * Filters:
 *  - agent must be enabled
 *  - agent.priority_floor must accommodate the task's priority
 *  - prefers standby agents, but will return working agents if no standby available
 */
export async function selectAgent(task: {
  department: string;
  business: string;
  priority: string;
}): Promise<Agent | null> {
  const agents = await getEnabledAgents();
  if (agents.length === 0) return null;

  const taskPriority = PRIORITY_RANK[task.priority] ?? 3;

  const scored = agents
    .filter((a) => {
      const floor = PRIORITY_RANK[a.priority_floor] ?? 3;
      return floor >= taskPriority;
    })
    .map((a) => {
      let score = 0;

      // Department match
      if (a.departments.length > 0 && a.departments.includes(task.department)) {
        score += 10;
      }

      // Business match
      if (a.businesses.length > 0 && a.businesses.includes(task.business)) {
        score += 5;
      }

      // Generalist bonus (handles any department)
      if (a.departments.length === 0) {
        score += 1;
      }

      // Prefer standby agents
      if (a.status === "standby") {
        score += 100;
      }

      return { agent: a, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored[0].agent : null;
}

/**
 * Select an agent by role (e.g., "reviewer" for auto-review dispatch).
 */
export async function selectAgentByRole(role: string): Promise<Agent | null> {
  const agents = await getEnabledAgents();
  const matches = agents
    .filter((a) => a.role === role)
    .sort((a, b) => {
      // Prefer standby
      if (a.status === "standby" && b.status !== "standby") return -1;
      if (b.status === "standby" && a.status !== "standby") return 1;
      return 0;
    });
  return matches.length > 0 ? matches[0] : null;
}
