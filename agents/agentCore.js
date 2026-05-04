import { MongoClient } from "mongodb";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";
import { allHandlers } from "../tools/common.js";

export class DynamicAgent {
	constructor(agentName, instructions, tools = [], skills = []) {
		this.role = agentName;
		this.instructions = instructions;
		this.skills = skills;
		this.tools = tools;

		// Initialize Gemini with API Key
		this.ai = new GoogleGenAI({
			apiKey: config.ai.key
		});
	}

	async initialize() {
		this.client = new MongoClient(config.db.uri, config.db.options);

		try {
			await this.client.connect();
			this.db = this.client.db(config.db.dbName);
			this.tasksCollection = this.db.collection("tasks");
			this.logsCollection = this.db.collection("agentLogs");

			console.log(`[${this.role}] Dynamic Agent Initialized. Connected to remote Blackboard.`);
			this.listenForTasks();
		} catch (error) {
			console.error(`[${this.role}] Connection Failed:`, error.message);
			process.exit(1);
		}
	}

	async log(taskId, level, message, context = {}) {
		await this.logsCollection.insertOne({
			taskId,
			agentRole: this.role,
			level,
			message,
			context,
			created: new Date()
		});
	}

	async listenForTasks() {
		const pipeline = [
			{ $match: { 
				"fullDocument.to": this.role, 
				"fullDocument.status": "pending" 
			}}
		];

		const changeStream = this.tasksCollection.watch(pipeline, { 
			fullDocument: "updateLookup" 
		});

		changeStream.on("change", async (event) => {
			const task = event.fullDocument;
			await this.processTask(task);
		});

		changeStream.on("error", (error) => {
			console.error(`[${this.role}] Change Stream Error:`, error);
			setTimeout(() => this.listenForTasks(), 5000);
		});
	}

	async processTask(task) {
		const taskId = task._id.toString();
		await this.log(taskId, "info", `Task Lifecycle Started: ${task.payload.instruction}`);
		
		let clarifications = task.clarifications || [];

		// Auto-migrate payload.userResponses to the latest clarification entry
		if (task.payload?.userResponses && clarifications.length > 0) {
			const lastIndex = clarifications.length - 1;
			if (!clarifications[lastIndex].answer) {
				clarifications[lastIndex].answer = task.payload.userResponses;
				
				await this.tasksCollection.updateOne(
					{ _id: task._id },
					{ 
						$set: { [`clarifications.${lastIndex}.answer`]: task.payload.userResponses },
						$unset: { "payload.userResponses": "" }
					}
				);
				await this.log(taskId, "info", "Auto-migrated user responses into clarification history.");
			}
		}

		await this.tasksCollection.updateOne(
			{ _id: task._id }, 
			{ $set: { status: "active", startedAt: new Date() } }
		);

		const result = await this.executeReasoning({ 
			...task.payload, 
			taskId,
			metadata: task.metadata,
			clarifications: clarifications
		});

		const currentTask = await this.tasksCollection.findOne({ _id: task._id });
		if (currentTask.status === "active") {
			await this.tasksCollection.updateOne(
				{ _id: task._id }, 
				{ $set: { 
					status: "done", 
					result: result, 
					completedAt: new Date() 
				}}
			);
			await this.log(taskId, "info", "Task Lifecycle Completed Successfully.");
		}
	}

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

		// Format clarification history
		let historyStr = "";
		if (payload.clarifications && payload.clarifications.length > 0) {
			historyStr = payload.clarifications.map((c, i) => 
				`Round ${i + 1}:\nAgent Asked:\n${c.questions}\nUser Answered:\n${c.answer || "No answer yet."}`
			).join("\n\n---\n\n");
		} else {
			historyStr = "None yet.";
		}

		let context = `
			Project Name: ${projectName}
			User Request: ${payload.instruction}
			
			Clarification History:
			${historyStr}
		`;

		await this.log(taskId, "info", "Reasoning Loop Started");

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
					await this.log(taskId, "info", "Reasoning Output", { text });
					finalResponse = text;
				}

				if (calls.length > 0) {
					const toolResponses = [];

					for (const call of calls) {
						const { name, args } = call.functionCall;
						await this.log(taskId, "debug", `Executing Tool: ${name}`, { args });

						const toolResult = await allHandlers[name]({
							...args,
							taskId,
							projectName,
							agentRole: this.role,
							metadata: payload.metadata
						});

						await this.log(taskId, "debug", `Tool Result: ${name}`, { toolResult });

						// Check for break signal (e.g., from askClarifyingQuestions)
						if (toolResult.breakLoop) {
							await this.log(taskId, "info", "Reasoning Loop paused by tool signal.");
							return toolResult.message || "Execution paused.";
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
				await this.log(taskId, "error", "Error during reasoning loop", { error: error.message });
				return `Error: ${error.message}`;
			}
		}

		return finalResponse;
	}
}