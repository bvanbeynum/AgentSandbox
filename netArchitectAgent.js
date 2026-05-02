import { BaseAgent } from "./agentCore.js";
import { agentInstructions } from "./instructions/netArchitectInstructions.js";
import { commonTools, commonToolHandlers } from "./tools/common.js";

class NetworkArchitectAgent extends BaseAgent {

	async executeReasoning(payload) {
		const taskId = payload.taskId;
		const projectName = payload.metadata?.projectName || "default-project";

		const chat = this.model.startChat({
			tools: [{ functionDeclarations: this.tools }]
		});

		const context = `
			Project Name: ${projectName}
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
			const response = result.response;
			const call = response.candidates?.[0]?.content?.parts?.find(part => part.functionCall);

			if (call) {
				const { name, args } = call.functionCall;
				console.log(`[Network Architect] Executing Tool: ${name}`);

				const toolResult = await commonToolHandlers[name]({
					...args,
					taskId,
					projectName,
					metadata: payload.metadata
				});

				message = [{ functionResponse: { name, response: toolResult } }];
			} else {
				try {
					finalResponse = response.text();
				} catch (e) {
					finalResponse = "Error: Could not extract text from model response.";
				}
				isComplete = true;
			}
		}

		return finalResponse;
	}
}

const agent = new NetworkArchitectAgent("Network Architect", agentInstructions, commonTools);
agent.initialize();
