import { BaseAgent } from "./agentCore.js";
import { agentInstructions } from "../instructions/dbArchitectInstructions.js";
import { commonTools, commonToolHandlers } from "../tools/common.js";

class DatabaseArchitectAgent extends BaseAgent {

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

		await this.log(taskId, "info", `Starting database architecture design for project: ${projectName}`, { instruction: payload.instruction });

		const instruction = payload.instruction || "";
		const stopKeywords = ["stop", "don't continue", "do not continue", "finish here", "only create", "then stop"];
		const inferredStop = stopKeywords.some(kw => instruction.toLowerCase().includes(kw));
		const shouldContinue = payload.metadata?.shouldContinue !== false && !inferredStop;

		const context = `
			Project Name: ${projectName}
			Blueprint Context: ${instruction}
			shouldContinue: ${shouldContinue}

			Task: Generate Mongoose schemas for this feature. 
			Place files in the "workspace/models" directory.
		`;

		await this.log(taskId, "info", "DB Reasoning Loop Started");

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
					await this.log(taskId, "info", "Database Architect Reasoning Output", { text });
					finalResponse = text;
				}

				if (calls.length > 0) {
					const toolResponses = [];

					for (const call of calls) {
						const { name, args } = call.functionCall;
						await this.log(taskId, "debug", `DB Executing Tool: ${name}`, { args });

						const toolResult = await commonToolHandlers[name]({
							...args,
							taskId,
							projectName,
							agentRole: this.role,
							metadata: payload.metadata
						});

						await this.log(taskId, "debug", `DB Tool Result: ${name}`, { toolResult });

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
				await this.log(taskId, "error", "Error during DB reasoning loop", { error: error.message });
				return `Error: ${error.message}`;
			}
		}

		return finalResponse || "DB Schema Generation Complete.";
	}
}

const agent = new DatabaseArchitectAgent("Database Architect", agentInstructions, commonTools);
agent.initialize();
