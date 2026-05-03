import { MongoClient } from "mongodb";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

export class BaseAgent {
	constructor(role, instructions, tools = [], skills = []) {
		this.role = role;
		this.instructions = instructions;
		this.tools = tools;
		this.skills = skills;

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

			console.log(`[${this.role}] Connected to remote Blackboard at data.beynum.com`);
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

		// Change streams require a Replica Set on the remote server
		const changeStream = this.tasksCollection.watch(pipeline, { 
			fullDocument: "updateLookup" 
		});

		changeStream.on("change", async (event) => {
			const task = event.fullDocument;
			await this.processTask(task);
		});

		changeStream.on("error", (error) => {
			console.error(`[${this.role}] Change Stream Error:`, error);
			// Logic to restart the stream if the network blips
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

		// Only set to "done" if a tool didn't already change the status (e.g., to "awaiting_user_input")
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
}