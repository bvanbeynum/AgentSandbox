import { BaseAgent } from "./agentCore.js";
import { agentInstructions } from "../instructions/netArchitectInstructions.js";
import { commonTools, commonToolHandlers } from "../tools/common.js";

class NetworkArchitectAgent extends BaseAgent {

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

		await this.log(taskId, "info", `Starting network architecture design for project: ${projectName}`, { instruction: payload.instruction });

		const context = `
			Project Name: ${projectName}
			Feature Context: ${payload.instruction}

			Task: Create the network architecture and security plan for this feature.
		`;

		await this.log(taskId, "info", "Network Reasoning Loop Started");

		let message = context;
		let isComplete = false;
		let finalResponse = "";

		while (!isComplete) {
			try {
				const response = await chat.sendMessage({ message: message });

				const parts = response.candidates?.[0]?.content?.parts || [];
				const text = parts.filter(p => p.text).map(p => p.text).join(" ").trim();
				const call = parts.find(p => p.functionCall);

				if (text && text.trim()) {
					await this.log(taskId, "info", "Network Reasoning Output", { text });
				}

				if (call) {
					const { name, args } = call.functionCall;
					await this.log(taskId, "debug", `Network Executing Tool: ${name}`, { args });

					const toolResult = await commonToolHandlers[name]({
						...args,
						taskId,
						projectName,
						agentRole: this.role,
						metadata: payload.metadata
					});

					await this.log(taskId, "debug", `Network Tool Result: ${name}`, { toolResult });

					message = [{ functionResponse: { name, response: toolResult } }];
				} else {
					finalResponse = text || "Network Architecture Design Complete.";
					isComplete = true;
				}
			} catch (error) {
				await this.log(taskId, "error", "Error during Network reasoning loop", { error: error.message });
				return `Error: ${error.message}`;
			}
		}

		return finalResponse;
	}
}

const agent = new NetworkArchitectAgent("Network Architect", agentInstructions, commonTools);
agent.initialize();
