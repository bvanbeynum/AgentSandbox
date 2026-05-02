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
	}
};
