import { MongoClient, ObjectId } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";
import { allHandlers } from "../tools/common.js";

export class DynamicAgent {
	constructor(agentId, agentName, instructions, tools = [], skills = [], modelConfig = null) {
		this.id = agentId;
		this.role = agentName; // Kept as 'role' for logging and internal reference
		this.instructions = instructions;
		this.skills = skills;
		this.tools = tools;
		this.modelConfig = modelConfig;

		// Initialize Gemini with API Key if present, otherwise rely on HTTP for Ollama
		if (this.modelConfig?.apikey) {
			this.genAI = new GoogleGenerativeAI(this.modelConfig.apikey);
		} else if (config.ai.key && (!this.modelConfig || this.modelConfig.apikey === undefined)) {
			// Fallback to default config if no model specific key provided and no URL present
			if (!this.modelConfig?.url) {
				this.genAI = new GoogleGenerativeAI(config.ai.key);
			}
		}
	}

	async callModel(messages, tools = []) {
		const modelName = this.modelConfig?.modelName || "gemini-2.0-flash";
		
		if (this.modelConfig?.url) {
			return this.callOllama(modelName, messages, tools);
		} else {
			return this.callGemini(modelName, messages, tools);
		}
	}

	async callGemini(modelName, messages, tools) {
		const model = this.genAI.getGenerativeModel({
			model: modelName,
			systemInstruction: this.instructions,
			tools: tools.length > 0 ? [{ functionDeclarations: tools }] : []
		});

		// Map messages to Gemini history format
		const history = messages.slice(0, -1).map(m => ({
			role: m.role === "user" ? "user" : "model",
			parts: [{ text: m.content }]
		}));
		const latestMessage = messages[messages.length - 1].content;

		const chat = model.startChat({ history });
		const result = await chat.sendMessage(latestMessage);
		const response = result.response;
		
		return {
			text: response.text().trim(),
			toolCalls: response.functionCalls()?.map(call => ({
				name: call.name,
				args: call.args
			})) || []
		};
	}

	async callOllama(modelName, messages, tools) {
		const url = `${this.modelConfig.url}/v1/chat/completions`;
		
		// Map messages to OpenAI format
		const formattedMessages = [
			{ role: "system", content: this.instructions },
			...messages.map(m => ({
				role: m.role === "agent" ? "assistant" : m.role,
				content: m.content
			}))
		];

		const body = {
			model: modelName,
			messages: formattedMessages
		};

		if (tools.length > 0) {
			body.tools = tools.map(t => ({
				type: "function",
				function: {
					name: t.name,
					description: t.description,
					parameters: t.parameters
				}
			}));
			body.tool_choice = "auto";
		}

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
				signal: AbortSignal.timeout(1800000) // 30 minute timeout for slow RPi generation
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Ollama API Error (${response.status}): ${errorText}`);
			}

			const data = await response.json();
			const choice = data.choices[0];
			
			return {
				text: choice.message.content?.trim() || "",
				toolCalls: choice.message.tool_calls?.map(tc => ({
					name: tc.function.name,
					args: JSON.parse(tc.function.arguments)
				})) || []
			};
		} catch (error) {
			// Re-throw to be handled by caller's log mechanism
			throw error;
		}
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
					$push: { messages: { role: "agent", content: result, timestamp: new Date() } },
					$set: { status: "user_turn", completedAt: new Date() } 
				}
			);
		}
		await this.log(sessionId, "info", "Session Turn Completed Successfully.");
	}

	async summarizeSession(session, latestModelResponse) {
		const sessionId = session._id.toString();
		await this.log(sessionId, "info", "Summarizing session history for context protection.");

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

		const result = await this.callModel([{ role: "user", content: prompt }]);
		const summary = result.text;

		// Update session: Save summary and truncate messages to keep only the last 2 turns
		const remainingMessages = [
			...session.messages.slice(-2),
			{ role: "agent", content: latestModelResponse, timestamp: new Date() }
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
		// Prepare history from session.messages
		const messages = (session.messages || []).map(m => ({
			role: m.role === "user" ? "user" : "agent",
			content: m.content
		}));

		if (messages.length === 0) {
			messages.push({ role: "user", content: "Start the conversation." });
		}

		// Use rolling summary if it exists to prime the context
		if (session.summary) {
			messages.unshift({ role: "user", content: `Summary of previous discussion: ${session.summary}` });
		}

		try {
			const result = await this.callModel(messages, this.tools);
			return result.text;
		} catch (error) {
			await this.log(session._id.toString(), "error", "Conversation Error", { 
				error: error.message,
				cause: error.cause ? (error.cause.message || error.cause) : null
			});
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
		let history = [{ role: "user", content: context }];

		while (!isComplete) {
			try {
				const result = await this.callModel(history, this.tools);
				
				if (result.text) {
					await this.log(taskId, "info", "Reasoning Output", { text: result.text });
					finalResponse = result.text;
					history.push({ role: "agent", content: result.text });
				}

				if (result.toolCalls && result.toolCalls.length > 0) {
					const toolResults = [];
					for (const call of result.toolCalls) {
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

						toolResults.push(`Tool ${name} result: ${JSON.stringify(toolResult)}`);
					}
					// Add tool results as a user-like message to continue the reasoning
					history.push({ role: "user", content: toolResults.join("\n\n") });
				} else {
					isComplete = true;
				}
			} catch (error) {
				await this.log(taskId, "error", "Error during reasoning loop", { 
					error: error.message,
					cause: error.cause ? (error.cause.message || error.cause) : null
				});
				return `Error: ${error.message}`;
			}
		}

		return finalResponse;
	}
}
