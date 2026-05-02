import { BaseAgent } from "./agentCore.js";
import { commonTools, commonToolHandlers } from "./tools/common.js";
import { baTools, baToolHandlers } from "./tools/baTool.js";
import { agentInstructions } from "./instructions/baInstructions.js";

const allTools = [...commonTools, ...baTools];
const allHandlers = { ...commonToolHandlers, ...baToolHandlers };

class BusinessAnalystAgent extends BaseAgent {

	async executeReasoning(payload) {
		const taskId = payload.taskId;
		const projectName = payload.metadata?.projectName || "default-project";

		const chat = this.model.startChat({
			tools: [{ functionDeclarations: this.tools }]
		});

		await this.log(taskId, "info", `Starting requirement analysis for project: ${projectName}`, { instruction: payload.instruction });

		// We pass the context: the initial prompt PLUS any previous responses from the user
		let context = `
			Project Name: ${projectName}
			User Request: ${payload.instruction}
			Previous User Responses: ${payload.userResponses || "None yet."}
		`;

		await this.log(taskId, "info", "BA Reasoning Loop Started");

		let isComplete = false;
		let finalResponse = "";

		while (!isComplete) {
			try {
				const result = await chat.sendMessage(context);
				const response = result.response;
				const text = response.text();
				const call = response.candidates[0].content.parts.find(part => part.functionCall);

				if (text && text.trim()) {
					await this.log(taskId, "info", "BA Reasoning Output", { text });
				}

				if (call) {
					const { name, args } = call.functionCall;

					await this.log(taskId, "debug", `BA Executing Tool: ${name}`, { args });

					// We pass the task ID, projectName and metadata so the tools can update records and target folders
					const toolResult = await allHandlers[name]({ 
						...args, 
						taskId, 
						projectName, 
						metadata: payload.metadata 
					});

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
					finalResponse = text;
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

const agent = new BusinessAnalystAgent("Business Analyst", agentInstructions, allTools);
agent.initialize();
