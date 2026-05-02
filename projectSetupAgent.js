import { BaseAgent } from "./agentCore.js";
import { agentInstructions } from "./instructions/projectSetupInstructions.js";
import { commonTools, commonToolHandlers } from "./tools/common.js";
import { projectSetupTools, projectSetupToolHandlers } from "./tools/projectSetupTool.js";

const allTools = [...commonTools, ...projectSetupTools];
const allHandlers = { ...commonToolHandlers, ...projectSetupToolHandlers };

class ProjectSetupAgent extends BaseAgent {

	async executeReasoning(payload) {
		const taskId = payload.taskId;
		const chat = this.model.startChat({
			tools: [{ functionDeclarations: this.tools }]
		});

		const context = `
			Blueprint: ${payload.instruction}
			Blueprint Location: workspace/blueprints/
			Network Plan Location: workspace/network-plans/
			
			Action Required: 
			1. Initialize npm in the workspace.
			2. Create the folder structure.
			3. Install Mongoose, Express, and Dotenv.
			4. Write the initial entry point (index.js).
		`;

		await this.log(taskId, "info", "Commencing Project Scaffolding");

		let isComplete = false;
		let finalSummary = "";
		let currentPrompt = context;

		while (!isComplete) {
			try {
				const result = await chat.sendMessage(currentPrompt);
				const call = result.response.candidates[0].content.parts.find(part => part.functionCall);

				if (call) {
					const { name, args } = call.functionCall;
					await this.log(taskId, "debug", `Setup Agent Tool: ${name}`, { args });

					const toolResult = await allHandlers[name]({ ...args, taskId });
					await this.log(taskId, "debug", `Setup Agent Tool Result: ${name}`, { toolResult });

					currentPrompt = [{ functionResponse: { name, response: toolResult } }];
				} 
				else {
					finalSummary = result.response.text();
					await this.log(taskId, "info", "Project Scaffolding Complete");
					isComplete = true;
				}
			} catch (error) {
				await this.log(taskId, "error", "Setup Loop Failed", { error: error.message });
				return `Setup failed: ${error.message}`;
			}
		}

		return finalSummary;
	}
}

const agent = new ProjectSetupAgent("Project Setup Developer", agentInstructions, allTools);
agent.initialize();
