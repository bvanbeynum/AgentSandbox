import { BaseAgent } from "./core/agentCore.js";
import { agentInstructions } from "./instructions/dbArchitectInstructions.js";
import { toolHandlers, nodeTools } from "./tools/nodeDeveloperTools.js";
import { baToolHandlers } from "./tools/baTools.js";

class DatabaseArchitectAgent extends BaseAgent {

	async executeReasoning(payload) {
		const chat = this.model.startChat({
			tools: [{ functionDeclarations: this.tools }]
		});

		const context = `
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

				let toolResult;
				// Logic to route tool calls to the correct handler
				if (name === "assignTask") {
					toolResult = await baToolHandlers.assignTask(args);
				} else {
					toolResult = await toolHandlers[name](args);
				}

				message = [{ functionResponse: { name, response: toolResult } }];
			} else {
				finalResponse = result.response.text();
				isComplete = true;
			}
		}

		return finalResponse;
	}
}

const agent = new DatabaseArchitectAgent("Database Architect", agentInstructions, nodeTools);
agent.initialize();
