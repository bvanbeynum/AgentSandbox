import { BaseAgent } from "./core/agentCore.js";
import { baTools, baToolHandlers } from "./tools/baTools.js";
import { agentInstructions } from "./instructions/baAgentInstructions.js";

class BusinessAnalystAgent extends BaseAgent {

	async executeReasoning(payload) {
		const taskId = payload.taskId;

		const chat = this.model.startChat({
			tools: [{ functionDeclarations: this.tools }]
		});

		await this.log(taskId, "info", "Starting requirement analysis", { instruction: payload.instruction });

		// We pass the context: the initial prompt PLUS any previous responses from the user
		const context = `
			User Request: ${payload.instruction}
			Previous User Responses: ${payload.userResponses || "None yet."}
		`;

		await this.log(taskId, "info", "BA Reasoning Loop Started");

		let isComplete = false;
		let finalResponse = "";

		while (!isComplete) {
			try {
				const result = await chat.sendMessage(context);
				const call = result.response.candidates[0].content.parts.find(part => part.functionCall);

				if (call) {
					const { name, args } = call.functionCall;

					await this.log(taskId, "debug", `BA Executing Tool: ${name}`, { args });

					// We pass the task ID so the tool can update the specific record
					const toolResult = await baToolHandlers[name]({ ...args, taskId: payload.taskId });

					await this.log(taskId, "debug", `BA Tool Result: ${name}`, { toolResult });

					// CRITICAL: If the agent asks questions, we must break the loop 
					// because the agent cannot proceed until the user updates the DB.
					if (name === "askClarifyingQuestions") {
						await this.log(taskId, "info", "BA paused to wait for user input.");
						return "Awaiting user clarification...";
					}

					// Feed the tool result back to the LLM to continue (e.g., after saving, it should assign)
					context = [{
						functionResponse: { name, response: toolResult }
					}];
				}
				else {
					finalResponse = result.response.text();
					isComplete = true;
				}
			} catch (error) {
				await this.log(taskId, "error", "Error during BA reasoning loop", { error: error.message });
				return `Error: ${error.message}`;
			}
		}

		return finalResponse;

	}
}

const agent = new BusinessAnalystAgent("Business Analyst", agentInstructions, baTools, baSkills);
agent.initialize();
