import { BaseAgent } from "./agentCore.js";
import { agentInstructions } from "../instructions/projectSetupInstructions.js";
import { commonTools, commonToolHandlers } from "../tools/common.js";
import { projectSetupTools, projectSetupToolHandlers } from "../tools/projectSetupTool.js";

const allTools = [...commonTools, ...projectSetupTools];
const allHandlers = { ...commonToolHandlers, ...projectSetupToolHandlers };

class ProjectSetupAgent extends BaseAgent {

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

		await this.log(taskId, "info", `Starting project setup for project: ${projectName}`, { instruction: payload.instruction });

		const context = `
			Project Name: ${projectName}
			Blueprint: ${payload.instruction}

			Action Required: 
			1. Initialize npm in the workspace.
			2. Create the folder structure.
			3. Install Mongoose, Express, and Dotenv.
			4. Write the initial entry point (index.js).
		`;

		await this.log(taskId, "info", "Project Setup Reasoning Loop Started");

		let isComplete = false;
		let finalSummary = "";
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
					await this.log(taskId, "info", "Project Setup Reasoning Output", { text });
					finalSummary = text;
				}

				if (calls.length > 0) {
					const toolResponses = [];

					for (const call of calls) {
						const { name, args } = call.functionCall;
						await this.log(taskId, "debug", `Setup Executing Tool: ${name}`, { args });

						const toolResult = await allHandlers[name]({
							...args,
							taskId,
							projectName,
							agentRole: this.role,
							metadata: payload.metadata
						});

						await this.log(taskId, "debug", `Setup Tool Result: ${name}`, { toolResult });

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
				await this.log(taskId, "error", "Error during project setup reasoning loop", { error: error.message });
				return `Error: ${error.message}`;
			}
		}

		return finalSummary || "Project Scaffolding Complete.";
	}
}

const agent = new ProjectSetupAgent("Project Setup Developer", agentInstructions, allTools);
agent.initialize();
