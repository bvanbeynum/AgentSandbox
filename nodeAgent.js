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

		await this.log(taskId, "info", `Starting Node.js development for project: ${projectName}`, { instruction: payload.instruction });

		let message = `Project Name: ${projectName}\nInstruction: ${payload.instruction}`;
		
		await this.log(taskId, "info", "Node Developer Reasoning Loop Started");

		let isComplete = false;

		while (!isComplete) {
			try {
				const result = await chat.sendMessage(message);
				const response = result.response;

				let text = "";
				try {
					text = response.text();
				} catch (e) {
					// text() throws if content is undefined
				}

				if (text && text.trim()) {
					await this.log(taskId, "info", "Node Developer Reasoning Output", { text });
				}

				const call = response.candidates?.[0]?.content?.parts?.find(part => part.functionCall);

				if (call) {
					const { name, args } = call.functionCall;
					await this.log(taskId, "debug", `Node Developer Executing Tool: ${name}`, { args });

					const toolResult = await commonToolHandlers[name]({ 
						...args, 
						taskId, 
						projectName, 
						metadata: payload.metadata 
					});

					await this.log(taskId, "debug", `Node Developer Tool Result: ${name}`, { toolResult });
					
					message = [{
						functionResponse: { name, response: toolResult }
					}];
				} else {
					isComplete = true;
					return text || "Node.js Development Task Complete.";
				}
			} catch (error) {
				await this.log(taskId, "error", "Error during Node Developer reasoning loop", { error: error.message });
				return `Error: ${error.message}`;
			}
		}
	}

}

const agent = new NodeDeveloperAgent("Node.js Developer", agentInstructions, commonTools, nodeSkills);
agent.initialize();
