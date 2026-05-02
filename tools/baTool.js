import fs from "fs/promises";
import { MongoClient, ObjectId } from "mongodb";
import { config } from "../config.js";

export const baTools = [
	{
		name: "askClarifyingQuestions",
		description: "Pauses the current process to ask the user for more details.",
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

	savePRD: async ({ featureName, content, directory }) => {
		const fileName = `prd-${featureName.toLowerCase().replace(/\s+/g, "-")}.md`;
		const fullPath = `${directory}/${fileName}`;
		await fs.mkdir(directory, { recursive: true });
		await fs.writeFile(fullPath, content, "utf8");
		return { status: "success", message: `PRD saved to ${fullPath}` };
	}
};
