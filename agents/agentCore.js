import { MongoClient, ObjectId } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import { allHandlers } from "../tools/common.js";

export class DynamicAgent {
	constructor(agentId, agentName, instructions, tools = [], skills = []) {
		this.id = agentId;
		this.role = agentName; // Kept as 'role' for logging and internal reference
		this.instructions = instructions;
		this.skills = skills;
		this.tools = tools;

		// Initialize Gemini with API Key
		this.genAI = new GoogleGenerativeAI(config.ai.key);
	}

	async initialize() {
		this.client = new MongoClient(config.db.uri, config.db.options);

		try {
			await this.client.connect();
			this.db = this.client.db(config.db.dbName);
			this.tasksCollection = this.db.collection("tasks");
			this.sessionsCollection = this.db.collection("sessions");
			this.logsCollection = this.db.collection("agentLogs");

			console.log(`[${this.role}] Dynamic Agent Initialized. ID: ${this.id}`);
			this.listenForWork();
		} catch (error) {
			console.error(`[${this.role}] Connection Failed:`, error.message);
			process.exit(1);
		}
	}

	async log(taskId, level, message, context = {}) {
		await this.logsCollection.insertOne({
			taskId,
			agentId: this.id,
			agentRole: this.role,
			level,
			message,
			context,
			created: new Date()
		});
	}

	async listenForWork() {
		// Watch for Tasks
		const taskPipeline = [
			{ $match: { 
				"fullDocument.to": this.id, 
				"fullDocument.status": { $in: ["pending", "user_response"] }
			}}
		];
		const taskStream = this.tasksCollection.watch(taskPipeline, { fullDocument: "updateLookup" });
		taskStream.on("change", async (event) => {
			await this.processTask(event.fullDocument);
		});

		// Watch for Sessions
		const sessionPipeline = [
			{ $match: { 
				"fullDocument.assignedAgentId": this.id, 
				"fullDocument.status": "agent_turn"
			}}
		];
		const sessionStream = this.sessionsCollection.watch(sessionPipeline, { fullDocument: "updateLookup" });
		sessionStream.on("change", async (event) => {
			await this.processSession(event.fullDocument);
		});

		const handleError = (error) => {
			console.error(`[${this.role}] Change Stream Error:`, error);
			setTimeout(() => this.listenForWork(), 5000);
		};

		taskStream.on("error", handleError);
		sessionStream.on("error", handleError);
	}

	async processSession(inboundSession) {
		const session = await this.sessionsCollection.findOne({ _id: inboundSession._id });
		if (!session) return;

		const sessionId = session._id.toString();
		await this.log(sessionId, "info", `Session Turn Started`);

		// Set status to active/processing if needed (though session flow is slightly different)
		await this.sessionsCollection.updateOne(
			{ _id: session._id },
			{ $set: { status: "active", startedAt: new Date() } }
		);

		const result = await this.executeConversation(session);

		// Context Protection: Check if we need to summarize
		const MAX_MESSAGES = 10;
		if (session.messages && session.messages.length >= MAX_MESSAGES) {
			await this.summarizeSession(session, result);
		} else {
			await this.sessionsCollection.updateOne(
				{ _id: session._id },
				{ 
					$push: { messages: { role: "model", content: result, timestamp: new Date() } },
					$set: { status: "user_turn", completedAt: new Date() } 
				}
			);
		}
		await this.log(sessionId, "info", "Session Turn Completed Successfully.");
	}

	async summarizeSession(session, latestModelResponse) {
		const sessionId = session._id.toString();
		await this.log(sessionId, "info", "Summarizing session history for context protection.");

		const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
		const historyText = session.messages.map(m => `${m.role}: ${m.content}`).join("\n");
		
		const prompt = `
			You are a summarization assistant. Below is a conversation history and the latest response.
			Summarize the entire discussion into a concise set of "Agreed Facts and Requirements" that can be used to continue the planning.
			
			History:
			${historyText}
			
			Latest Response:
			${latestModelResponse}
			
			Summary:
		`;

		const result = await model.generateContent(prompt);
		const summary = result.response.text();

		// Update session: Save summary and truncate messages to keep only the last 2 turns
		const remainingMessages = [
			...session.messages.slice(-2),
			{ role: "model", content: latestModelResponse, timestamp: new Date() }
		];

		await this.sessionsCollection.updateOne(
			{ _id: session._id },
			{ 
				$set: { 
					summary: summary,
					messages: remainingMessages,
					status: "user_turn",
					completedAt: new Date()
				}
			}
		);
	}

	async executeConversation(session) {
		const model = this.genAI.getGenerativeModel({
			model: "gemini-2.5-flash", // Still using Gemini for now as per plan Phase 2
			systemInstruction: this.instructions,
			tools: [{ functionDeclarations: this.tools }]
		});

		// Prepare history from session.messages
		const history = (session.messages || []).map(m => ({
			role: m.role === "user" ? "user" : "model",
			parts: [{ text: m.content }]
		}));

		// Use rolling summary if it exists to prime the context
		let initialContext = session.summary ? `Summary of previous discussion: ${session.summary}\n\n` : "";
		
		const chat = model.startChat({ history });
		const latestMessage = history.length > 0 ? history[history.length - 1].parts[0].text : "Start the conversation.";

		try {
			const result = await chat.sendMessage(latestMessage);
			return result.response.text();
		} catch (error) {
			await this.log(session._id.toString(), "error", "Conversation Error", { error: error.message });
			return `Error: ${error.message}`;
		}
	}

	async processTask(inboundTask) {
		const task = await this.tasksCollection.findOne({ _id: inboundTask._id });
		if (!task) return;

		const taskId = task._id.toString();
		await this.log(taskId, "info", `Task Lifecycle Started: ${task.payload?.instruction || "No instruction"}`);
		
		let clarifications = task.clarifications || [];

		// Auto-migrate user responses
		if (task.payload?.userResponses) {
			const lastIndex = clarifications.length - 1;
			if (lastIndex >= 0 && !clarifications[lastIndex].answer) {
				clarifications[lastIndex].answer = task.payload.userResponses;
				await this.tasksCollection.updateOne(
					{ _id: task._id },
					{ 
						$set: { [`clarifications.${lastIndex}.answer`]: task.payload.userResponses },
						$unset: { "payload.userResponses": "" }
					}
				);
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

		const model = this.genAI.getGenerativeModel({
			model: "gemini-2.5-flash", 
			systemInstruction: this.instructions,
			tools: [{ functionDeclarations: this.tools }]
		});

		const chat = model.startChat({ history: [] });

		// Format clarification history
		let historyStr = "";
		const clarifications = payload.clarifications || [];
		if (clarifications.length > 0) {
			historyStr = clarifications.map((c, i) => 
				`Round ${i + 1}:\nAgent Asked:\n${c.questions}\nUser Answered:\n${c.answer || "No answer yet."}`
			).join("\n\n---\n\n");
		} else {
			historyStr = "None yet.";
		}

		const instruction = payload.instruction || "";
		
		let context = `
			Project Name: ${projectName}
			User Request: ${instruction}
			
			Clarification History:
			${historyStr}
		`;

		await this.log(taskId, "info", "Reasoning Loop Started", { context });

		let isComplete = false;
		let finalResponse = "";
		let currentMessage = context;

		while (!isComplete) {
			try {
				const result = await chat.sendMessage(currentMessage);
				const response = result.response;
				
				const text = response.text().trim();
				const calls = response.functionCalls();

				if (text) {
					await this.log(taskId, "info", "Reasoning Output", { text });
					finalResponse = text;
				}

				if (calls && calls.length > 0) {
					const toolResponses = [];
					for (const call of calls) {
						const { name, args } = call;
						const toolResult = await allHandlers[name]({
							...args,
							taskId,
							projectName,
							agentId: this.id,
							agentRole: this.role,
							metadata: payload.metadata
						});

						if (toolResult.breakLoop) {
							await this.log(taskId, "info", "Reasoning Loop paused by tool signal.");
							return toolResult.message || "Execution paused.";
						}

						toolResponses.push({
							functionResponse: { name, response: toolResult }
						});
					}
					currentMessage = toolResponses;
				} else {
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
