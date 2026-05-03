import { BaseAgent } from "./agentCore.js";
import { commonTools, commonToolHandlers } from "../tools/common.js";
import { baTools, baToolHandlers } from "../tools/baTool.js";
import { agentInstructions } from "../instructions/baInstructions.js";

const allTools = [...commonTools, ...baTools];
const allHandlers = { ...commonToolHandlers, ...baToolHandlers };

class BusinessAnalystAgent extends BaseAgent {

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

		await this.log(taskId, "info", `Starting requirement analysis for project: ${projectName}`, { instruction: payload.instruction });

		// Format clarification history for the LLM
		let historyStr = "";
		if (payload.clarifications && payload.clarifications.length > 0) {
			historyStr = payload.clarifications.map((c, i) => 
				`Round ${i + 1}:\nAgent Asked:\n${c.questions}\n\nUser Answered:\n${c.answer || "No answer yet."}`
			).join("\n\n---\n\n");
		} else {
			historyStr = "None yet.";
		}

		// We pass the context: the initial prompt PLUS the structured Q&A history
		const instruction = payload.instruction || "";
		const stopKeywords = ["stop", "don't continue", "do not continue", "finish here", "create the prd and then stop", "only create"];
		const inferredStop = stopKeywords.some(kw => instruction.toLowerCase().includes(kw));
		const shouldContinue = payload.metadata?.shouldContinue !== false && !inferredStop;

		let context = `
			Project Name: ${projectName}
			User Request: ${instruction}
			shouldContinue: ${shouldContinue}

			Clarification History:
			${historyStr}
		`;

		await this.log(taskId, "info", "BA Reasoning Loop Started");

		let isComplete = false;
		let finalResponse = "";
		let currentMessage = context;

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
					await this.log(taskId, "info", "BA Reasoning Output", { text });
					finalResponse = text;
				}

				if (calls.length > 0) {
					const toolResponses = [];

					for (const call of calls) {
						const { name, args } = call.functionCall;
						await this.log(taskId, "debug", `BA Executing Tool: ${name}`, { args });

						const toolResult = await allHandlers[name]({ 
							...args, 
							taskId, 
							projectName, 
							agentRole: this.role,
							metadata: payload.metadata 
						});

						await this.log(taskId, "debug", `BA Tool Result: ${name}`, { toolResult });

						if (name === "askClarifyingQuestions") {
							await this.log(taskId, "info", "BA paused to wait for user input.");
							return "Awaiting user clarification...";
						}

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
				await this.log(taskId, "error", "Error during BA reasoning loop", { error: error.message });
				return `Error: ${error.message}`;
			}
		}
		return finalResponse;

	}
}

const agent = new BusinessAnalystAgent("Business Analyst", agentInstructions, allTools);
agent.initialize();
