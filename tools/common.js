import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { MongoClient, ObjectId } from "mongodb";
import { config } from "../config.js";

const execPromise = promisify(exec);

export const commonTools = [
	{
		name: "writeFile",
		description: "Creates or overwrites a JavaScript/JSON file.",
		parameters: {
			type: "object",
			properties: {
				path: { type: "string", description: "Path including filename (e.g., 'src/app.js')" },
				content: { type: "string", description: "The JavaScript code or JSON string" },
				projectName: { type: "string" },
				isInternal: { type: "boolean" }
			},
			required: ["path", "content"]
		}
	},
	{
		name: "runCommand",
		description: "Executes shell commands like 'docker run' or 'mkdir'.",
		parameters: {
			type: "object",
			properties: {
				command: { type: "string" }
			},
			required: ["command"]
		}
	},
	{
		name: "readProjectFile",
		description: "Reads the content of an existing file to understand the codebase.",
		parameters: {
			type: "object",
			properties: {
				path: { type: "string" },
				projectName: { type: "string" },
				isInternal: { type: "boolean" }
			},
			required: ["path"]
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
				taskId: { type: "string" },
				from: { type: "string", description: "The role of the current agent" },
				metadata: { type: "object", description: "Metadata to pass to the next agent (e.g., projectName)" }
			},
			required: ["to", "instruction", "taskId"]
		}
	}
];

export const commonToolHandlers = {
	writeFile: async ({ path, content, projectName, isInternal = false }) => {
		const baseDir = isInternal ? config.paths.internal : `${config.paths.projects}/${projectName}`;
		const fullPath = `${baseDir}/${path}`;

		await fs.mkdir(fullPath.split("/").slice(0, -1).join("/"), { recursive: true });
		await fs.writeFile(fullPath, content, "utf8");

		return { status: "success", message: `File written to ${fullPath}.` };
	},

	runCommand: async ({ command }) => {
		try {
			const { stdout, stderr } = await execPromise(command);
			return { status: "success", stdout, stderr };
		} catch (error) {
			return { status: "error", message: error.message, stdout: error.stdout };
		}
	},

	readProjectFile: async ({ path, projectName, isInternal = false }) => {
		const baseDir = isInternal ? config.paths.internal : `${config.paths.projects}/${projectName}`;
		const fullPath = `${baseDir}/${path}`;
		const data = await fs.readFile(fullPath, "utf8");
		return { status: "success", content: data };
	},

	assignTask: async ({ to, instruction, taskId, from = "Agent", metadata }) => {
		const client = new MongoClient(config.db.uri, config.db.options);

		try {
			await client.connect();
			const db = client.db(config.db.dbName);

			await db.collection("tasks").insertOne({
				from: from,
				to: to,
				status: "pending",
				payload: {
					instruction: instruction,
					parentTaskId: taskId
				},
				metadata: metadata,
				createdAt: new Date()
			});

			return { status: "success", message: `Task assigned to ${to}` };
		} finally {
			await client.close();
		}
	}
};
