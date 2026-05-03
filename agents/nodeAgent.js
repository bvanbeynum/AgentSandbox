import { BaseAgent } from "./agentCore.js";
import { commonTools, commonToolHandlers } from "../tools/common.js";
import { nodeSkills } from "../skills/nodeAgentSkills.js";
import { agentInstructions } from "../instructions/nodeAgentInstructions.js";

class NodeDeveloperAgent extends BaseAgent {

	async executeReasoning(payload) {
		const taskId = payload.taskId;
		const projectName = payload.metadata?.projectName || "default-project";

		const chat = this.ai.chats.create({
			model: "gemini-2.5-flash",
			config: {
				systemInstruction: this.instructions,
				tools: [{ functionDeclarations: this.tools }],
				thinkingConfig: { thinkingBudget: 2048 }
			}
		});

		await this.log(taskId, "info", `Starting Node.js development for project: ${projectName}`, { instruction: payload.instruction });

		let message = `Project Name: ${projectName}\nInstruction: ${payload.instruction}`;
		
		await this.log(taskId, "info", "Node Developer Reasoning Loop Started");

		let isComplete = false;

		while (!isComplete) {
			try {
				const response = await chat.sendMessage({ message: message });

				const parts = response.candidates?.[0]?.content?.parts || [];
				const text = parts.filter(p => p.text).map(p => p.text).join(" ").trim();
				const call = parts.find(p => p.functionCall);

				if (text && text.trim()) {
					await this.log(taskId, "info", "Node Developer Reasoning Output", { text });
				}

				if (call) {
					const { name, args } = call.functionCall;
					await this.log(taskId, "debug", `Node Developer Executing Tool: ${name}`, { args });

					const toolResult = await commonToolHandlers[name]({
						...args,
						taskId,
						projectName,
						agentRole: this.role,
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
