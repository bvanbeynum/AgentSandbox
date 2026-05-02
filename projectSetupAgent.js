import { BaseAgent } from "./agentCore.js";
import { agentInstructions } from "./instructions/projectSetupInstructions.js";
import { commonTools, commonToolHandlers } from "./tools/common.js";
import { projectSetupTools, projectSetupToolHandlers } from "./tools/projectSetupTool.js";

const allTools = [...commonTools, ...projectSetupTools];
const allHandlers = { ...commonToolHandlers, ...projectSetupToolHandlers };

class ProjectSetupAgent extends BaseAgent {

	async executeReasoning(payload) {
		const taskId = payload.taskId;
		const projectName = payload.metadata?.projectName || "default-project";

		const chat = this.model.startChat({
			tools: [{ functionDeclarations: this.tools }]
		});

		await this.log(taskId, "info", `Starting project scaffolding for project: ${projectName}`, { instruction: payload.instruction });

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
		let currentPrompt = context;

		while (!isComplete) {
			try {
				const result = await chat.sendMessage(currentPrompt);
				const response = result.response;

				let text = "";
				try {
					text = response.text();
				} catch (e) {
					// text() throws if content is undefined
				}

				if (text && text.trim()) {
					await this.log(taskId, "info", "Project Setup Reasoning Output", { text });
				}

				const call = response.candidates?.[0]?.content?.parts?.find(part => part.functionCall);

				if (call) {
					const { name, args } = call.functionCall;
					await this.log(taskId, "debug", `Setup Executing Tool: ${name}`, { args });

					const toolResult = await allHandlers[name]({ 
						...args, 
						taskId, 
						projectName, 
						metadata: payload.metadata 
					});
					await this.log(taskId, "debug", `Setup Tool Result: ${name}`, { toolResult });

					currentPrompt = [{ functionResponse: { name, response: toolResult } }];
				} 
				else {
					finalSummary = text || "Project Scaffolding Complete.";
					await this.log(taskId, "info", "Project Scaffolding Complete");
					isComplete = true;
				}
			} catch (error) {
				await this.log(taskId, "error", "Error during Project Setup reasoning loop", { error: error.message });
				return `Setup failed: ${error.message}`;
			}
		}

		return finalSummary;
	}
}

const agent = new ProjectSetupAgent("Project Setup Developer", agentInstructions, allTools);
agent.initialize();
