import { BaseAgent } from "./core/agentCore.js";
import { agentInstructions } from "./networkInstructions.js";
import { toolHandlers, nodeTools } from "./tools/nodeDeveloperTools.js";
import { baToolHandlers } from "./tools/baTools.js";

class NetworkArchitectAgent extends BaseAgent {

	async executeReasoning(payload) {
		const chat = this.model.startChat({
			tools: [{ functionDeclarations: this.tools }]
		});

		const context = `
			Feature Context: ${payload.instruction}
			Input Requirements:
			- PRD Location: workspace/prds/
			- Software Blueprint: workspace/blueprints/
			- Remote DB: data.beynum.com
			
			Task: Create the network architecture and security plan for this feature.
		`;

		let message = context;
		let isComplete = false;
		let finalResponse = "";

		while (!isComplete) {
			const result = await chat.sendMessage(message);
			const call = result.response.candidates[0].content.parts.find(part => part.functionCall);

			if (call) {
				const { name, args } = call.functionCall;
				console.log(`[Network Architect] Executing Tool: ${name}`);

				let toolResult;
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

const agent = new NetworkArchitectAgent("Network Architect", agentInstructions, nodeTools);
agent.initialize();
