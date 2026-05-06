# Agent Architecture: Micro-Agent & Session Model (Implemented)

## Objective
The architecture has been transitioned from a task-based monolithic model to an Orchestrator-Worker model utilizing a `sessions` collection for conversational planning and a `tasks` collection for DAG-based execution. The system is standardized on agent IDs (`_id`) and optimized for constrained local hardware (e.g., Raspberry Pi 5).

## Core Components

### 1. Database Collections
- **`agents`**: The source of truth for agent identities, instructions, and tools.
- **`sessions`**: Stores conversational planning history between the user and the **Thought Agent**.
  - `assignedAgentId`: MongoDB `_id` of the agent.
  - `status`: `user_turn`, `agent_turn`, `finalized`, `active`.
  - `summary`: A rolling summary for context protection.
- **`tasks`**: Stores atomic units of work for worker agents.
  - `to`: MongoDB `_id` of the target agent.
  - `status`: `pending`, `active`, `done`, `blocked`, `user_response`.
  - `dependencies`: Array of `{ type, targetId }` (e.g., `task_completion` for task IDs, `artifact_creation` for artifact names).
- **`skills`**: Markdown-based instructions retrieved via `activate_skill`.
- **`agentLogs`**: Standardized logging using `agentId`.

### 2. Specialized Agents
- **Thought Agent (`69fb471b3bcf11f772ce108a`)**: High-level brainstorming and planning.
- **Project Manager (`69fb471b3bcf11f772ce108c`)**: Decomposes plans into micro-tasks and manages dependency chains.
- **Worker Agents**: Hyper-specialized agents (BA, Architect, Developer, etc.) with narrow scopes.

### 3. Key Mechanisms

#### Dual-Listener Core (`agentCore.js`)
Agents watch both the `tasks` and `sessions` collections via MongoDB Change Streams.
- **`processSession`**: Handles turn-based chat, updating the history and summary.
- **`processTask`**: Handles tool-driven execution and reasoning loops.

#### Dependency Resolver (`runAgents.js`)
A centralized event listener that monitors the `done` status of tasks and the creation of artifacts. It automatically updates "blocked" tasks to "pending" when their prerequisites are satisfied.

#### Just-In-Time (JIT) Skills
Agents use the `activate_skill(skillName)` tool to fetch specialized instructions from the `skills` collection. This minimizes the initial context window size, preventing model degradation on small LLMs.

## Operational Workflow
1. **Planning**: User and Thought Agent converse in a `session`.
2. **Decomposition**: Once `finalized`, the Project Manager creates a Directed Acyclic Graph (DAG) of `tasks`.
3. **Execution**: Independent tasks start as `pending`. Dependent tasks start as `blocked`.
4. **Resolution**: As agents complete tasks, the Dependency Resolver unblocks the next agents in the chain.
5. **Finalization**: The process continues until the full plan is realized through atomic artifacts.
