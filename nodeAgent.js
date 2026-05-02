import { BaseAgent } from "./agentCore.js";
import { commonTools, commonToolHandlers } from "./tools/common.js";
import { nodeSkills } from "./skills/nodeAgentSkills.js";
import { agentInstructions } from "./instructions/nodeAgentInstructions.js";

class NodeDeveloperAgent extends BaseAgent {

	async executeReasoning(payload) {
		const taskId = payload.taskId;
		const projectName = payload.metadata?.projectName || "default-project";

		const chat = this.model.startChat({
			tools: [{ functionDeclarations: this.tools }]
		});

		let message = `Project Name: ${projectName}\nInstruction: ${payload.instruction}`;
		let isComplete = false;

		while (!isComplete) {
			const result = await chat.sendMessage(message);
			const response = result.response;
			const call = response.candidates?.[0]?.content?.parts?.find(part => part.functionCall);

			if (call) {
				const { name, args } = call.functionCall;
				console.log(`[${this.role}] Executing Tool: ${name}`);
				const toolResult = await commonToolHandlers[name]({ 
					...args, 
					taskId, 
					projectName, 
					metadata: payload.metadata 
				});
				
				message = [{
					functionResponse: { name, response: toolResult }
				}];
			} else {
				isComplete = true;
				try {
					return response.text();
				} catch (e) {
					return "Error: Could not extract text from model response.";
				}
			}
		}
	}

}

const agent = new NodeDeveloperAgent("Node.js Developer", agentInstructions, commonTools, nodeSkills);
agent.initialize();
