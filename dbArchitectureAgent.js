import { BaseAgent } from "./agentCore.js";
import { agentInstructions } from "./instructions/dbArchitectInstructions.js";
import { commonTools, commonToolHandlers } from "./tools/common.js";

class DatabaseArchitectAgent extends BaseAgent {

	async executeReasoning(payload) {
		const taskId = payload.taskId;
		const projectName = payload.metadata?.projectName || "default-project";

		const chat = this.model.startChat({
			tools: [{ functionDeclarations: this.tools }]
		});

		await this.log(taskId, "info", `Starting DB schema design for project: ${projectName}`, { instruction: payload.instruction });

		const context = `
			Project Name: ${projectName}
			Blueprint Context: ${payload.instruction}
			
			Task: Generate Mongoose schemas for this feature. 
			Place files in the "workspace/models" directory.
		`;

		await this.log(taskId, "info", "DB Reasoning Loop Started");

		let message = context;
		let isComplete = false;
		let finalResponse = "";

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
					await this.log(taskId, "info", "DB Reasoning Output", { text });
				}

				const call = response.candidates?.[0]?.content?.parts?.find(parts => parts.functionCall);

				if (call) {
					const { name, args } = call.functionCall;
					await this.log(taskId, "debug", `DB Executing Tool: ${name}`, { args });

					const toolResult = await commonToolHandlers[name]({
						...args,
						taskId,
						projectName,
						metadata: payload.metadata
					});

					await this.log(taskId, "debug", `DB Tool Result: ${name}`, { toolResult });

					message = [{ functionResponse: { name, response: toolResult } }];
				} else {
					finalResponse = text || "DB Schema Generation Complete.";
					isComplete = true;
				}
			} catch (error) {
				await this.log(taskId, "error", "Error during DB reasoning loop", { error: error.message });
				return `Error: ${error.message}`;
			}
		}

		return finalResponse;
	}
}

const agent = new DatabaseArchitectAgent("Database Architect", agentInstructions, commonTools);
agent.initialize();
