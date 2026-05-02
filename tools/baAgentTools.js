import fs from "fs/promises";
import { MongoClient, ObjectId } from "mongodb";
import { config } from "../config.js";

export const baTools = [
	{
		name: "askClarifyingQuestions",
		description: "Pauses PRD generation to ask the user for more details.",
		parameters: {
			type: "object",
			properties: {
				questions: { type: "string", description: "The list of questions for the user." },
				taskId: { type: "string" }
			},
			required: ["questions", "taskId"]
		}
	},

	{
		name: "assignTask",
		description: "Assigns a task to the next agent in the chain (e.g., Software Architect).",
		parameters: {
			type: "object",
			properties: {
				to: { type: "string", description: "The role of the target agent" },
				instruction: { type: "string", description: "Detailed instructions for the next agent" },
				taskId: { type: "string" }
			},
			required: ["to", "instruction", "taskId"]
		}
	},

	{
		name: "savePRD",
		description: "Saves the finalized PRD as a markdown file.",
		parameters: {
			type: "object",
			properties: {
				featureName: { type: "string" },
				content: { type: "string" },
				directory: { type: "string", description: "The directory path to save in." }
			},
			required: ["featureName", "content", "directory"]
		}
	}
];

export const baToolHandlers = {

	askClarifyingQuestions: async ({ questions, taskId }) => {
		const client = new MongoClient(config.db.uri);
		await client.connect();
		const db = client.db(config.db.dbName);

		// Update the task so the user sees the questions and the agent stops "pending"
		await db.collection("tasks").updateOne(
			{ _id: new ObjectId(taskId) },
			{ 
				$set: { 
					status: "awaiting_user_input", 
					questions: questions 
				} 
			}
		);
		await client.close();
		return { status: "success", message: "Waiting for user feedback." };
	},

	assignTask: async ({ to, instruction, taskId }) => {
		const client = new MongoClient(config.db.uri, config.db.options);

		try {
			await client.connect();
			const db = client.db(config.db.dbName);

			await db.collection("tasks").insertOne({
				from: "Business Analyst",
				to: to,
				status: "pending",
				payload: { 
					instruction: instruction,
					parentTaskId: taskId
				},
				createdAt: new Date()
			});

			return { status: "success", message: `Task assigned to ${to}` };
		} finally {
			await client.close();
		}
	},

	savePRD: async ({ featureName, content, directory }) => {
		const fileName = `prd-${featureName.toLowerCase().replace(/\s+/g, "-")}.md`;
		const fullPath = `${directory}/${fileName}`;
		await fs.mkdir(directory, { recursive: true });
		await fs.writeFile(fullPath, content, "utf8");
		return { status: "success", message: `PRD saved to ${fullPath}` };
	}
	
};