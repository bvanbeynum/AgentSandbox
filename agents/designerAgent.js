import { BaseAgent } from "./agentCore.js";
import { agentInstructions } from "../instructions/designerInstructions.js";
import { commonTools, commonToolHandlers } from "../tools/common.js";
import { designerTools, designerToolHandlers } from "../tools/designerTool.js";

const allTools = [...commonTools, ...designerTools];
const allHandlers = { ...commonToolHandlers, ...designerToolHandlers };

class DesignerAgent extends BaseAgent {

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

		await this.log(taskId, "info", `Starting UI design for project: ${projectName}`, { instruction: payload.instruction });

		const instruction = payload.instruction || "";
		const stopKeywords = ["stop", "don't continue", "do not continue", "finish here", "only create", "then stop"];
		const inferredStop = stopKeywords.some(kw => instruction.toLowerCase().includes(kw));
		const shouldContinue = payload.metadata?.shouldContinue !== false && !inferredStop;

		const context = `
			Project Name: ${projectName}
			shouldContinue: ${shouldContinue}
			instruction: ${instruction}
			Task: Generate a high-fidelity mockup for this project based on the PRD.
		`;

		await this.log(taskId, "info", "Designer Reasoning Loop Started");

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
					await this.log(taskId, "info", "Designer Reasoning Output", { text });
				}

				if (call) {
					const { name, args } = call.functionCall;
					await this.log(taskId, "debug", `Designer Executing Tool: ${name}`, { args });

					const toolResult = await allHandlers[name]({
						...args,
						taskId,
						projectName,
						metadata: payload.metadata
					});

					await this.log(taskId, "debug", `Designer Tool Result: ${name}`, { toolResult });

					message = [{ functionResponse: { name, response: toolResult } }];
				} else {
					finalResponse = text || "UI Mockup Generation Complete.";
					isComplete = true;
				}
			} catch (error) {
				await this.log(taskId, "error", "Error during Designer reasoning loop", { error: error.message });
				return `Error: ${error.message}`;
			}
		}

		return finalResponse;
	}
}

const agent = new DesignerAgent("Designer", agentInstructions, allTools);
agent.initialize();
