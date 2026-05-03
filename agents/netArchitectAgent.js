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
				tools: [{ functionDeclarations: this.tools }]
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
		let currentMessage = message;

		while (!isComplete) {
			try {
				const response = await chat.sendMessage({ message: currentMessage });

				if (!response.candidates || response.candidates.length === 0) {
					break;
				}

				const parts = response.candidates[0].content?.parts || [];
				const text = parts.filter(p => p.text).map(p => p.text).join(" ").trim();
				const calls = parts.filter(p => p.functionCall);

				if (text) {
					await this.log(taskId, "info", "Network Architect Reasoning Output", { text });
					finalResponse = text;
				}

				if (calls.length > 0) {
					const toolResponses = [];

					for (const call of calls) {
						const { name, args } = call.functionCall;
						await this.log(taskId, "debug", `Network Tool Executing: ${name}`, { args });

						const toolResult = await commonToolHandlers[name]({
							...args,
							taskId,
							projectName,
							agentRole: this.role,
							metadata: payload.metadata
						});

						await this.log(taskId, "debug", `Network Tool Result: ${name}`, { toolResult });

						toolResponses.push({
							functionResponse: { name, response: toolResult }
						});
					}

					currentMessage = toolResponses;
				}
				else {
					isComplete = true;
				}
			} catch (error) {
				await this.log(taskId, "error", "Error during network reasoning loop", { error: error.message });
				return `Error: ${error.message}`;
			}
		}

		return finalResponse || "Network Infrastructure Design Complete.";
	}
}

const agent = new NetworkArchitectAgent("Network Architect", agentInstructions, commonTools);
agent.initialize();
