import { BaseAgent } from "./agentCore.js";
import { toolHandlers, nodeTools } from "./tools/nodeAgentTools.js";
import { nodeSkills } from "./skills/nodeAgentSkills.js";
import { agentInstructions } from "./agentInstructions.js";

class NodeDeveloperAgent extends BaseAgent {

	async executeReasoning(payload) {
		const chat = this.model.startChat({
			tools: [{ functionDeclarations: nodeTools }]
		});

		let message = payload.instruction;
		let isComplete = false;

		while (!isComplete) {
			const result = await chat.sendMessage(message);
			const call = result.response.candidates[0].content.parts.find(part => part.functionCall);

			if (call) {
				const { name, args } = call.functionCall;
				console.log(`[${this.role}] Executing Tool: ${name}`);
				const toolResult = await toolHandlers[name](args);
				
				message = [{
					functionResponse: { name, response: toolResult }
				}];
			} else {
				isComplete = true;
				return result.response.text();
			}
		}
	}

}

const agent = new NodeDeveloperAgent("Node.js Developer", agentInstructions, nodeTools, nodeSkills);
agent.initialize();