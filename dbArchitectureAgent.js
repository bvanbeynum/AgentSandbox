import { BaseAgent } from "./agentCore.js";
import { agentInstructions } from "./instructions/dbArchitectInstructions.js";
import { commonTools, commonToolHandlers } from "./tools/common.js";

class DatabaseArchitectAgent extends BaseAgent {

	async executeReasoning(payload) {
		const taskId = payload.taskId;
		const projectName = payload.metadata?.projectName || "default-project";

		const chat = this.model.startChat({
			tools: [{ functionDeclarations: this.tools }]
		});

		const context = `
			Project Name: ${projectName}
			Blueprint Context: ${payload.instruction}
			Blueprint Location: ${payload.blueprintPath || "Check the workspace/blueprints directory."}
			
			Task: Generate Mongoose schemas for this feature. 
			Place files in the "workspace/models" directory.
		`;

		let message = context;
		let isComplete = false;
		let finalResponse = "";

		while (!isComplete) {
			const result = await chat.sendMessage(message);
			const call = result.response.candidates[0].content.parts.find(parts => parts.functionCall);

			if (call) {
				const { name, args } = call.functionCall;
				console.log(`[DB Architect] Executing Tool: ${name}`);

				const toolResult = await commonToolHandlers[name]({
					...args,
					taskId,
					projectName,
					metadata: payload.metadata
				});

				message = [{ functionResponse: { name, response: toolResult } }];
			} else {
				finalResponse = result.response.text();
				isComplete = true;
			}
		}

		return finalResponse;
	}
}

const agent = new DatabaseArchitectAgent("Database Architect", agentInstructions, commonTools);
agent.initialize();
