import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { MongoClient, ObjectId } from "mongodb";
import { config } from "../config.js";

const execPromise = promisify(exec);

export const commonTools = [
	{
		name: "writeFile",
		description: "Creates or overwrites a JavaScript/JSON file in the project directory.",
		parameters: {
			type: "object",
			properties: {
				path: { type: "string", description: "Path including filename (e.g., 'src/app.js')" },
				content: { type: "string", description: "The JavaScript code or JSON string" },
				projectName: { type: "string" }
			},
			required: ["path", "content", "projectName"]
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
		description: "Reads the content of an existing file in the project directory.",
		parameters: {
			type: "object",
			properties: {
				path: { type: "string" },
				projectName: { type: "string" }
			},
			required: ["path", "projectName"]
		}
	},
	{
		name: "addProjectArtifact",
		description: "Saves a project artifact (like a PRD, blueprint, or task list) to the database.",
		parameters: {
			type: "object",
			properties: {
				projectName: { type: "string" },
				artifactName: { type: "string", description: "Descriptive name (e.g., 'PRD', 'Technical-Blueprint')" },
				content: { type: "string", description: "The content of the artifact (usually Markdown)" }
			},
			required: ["projectName", "artifactName", "content"]
		}
	},
	{
		name: "readProjectArtifact",
		description: "Reads a project artifact from the database.",
		parameters: {
			type: "object",
			properties: {
				projectName: { type: "string" },
				artifactName: { type: "string" }
			},
			required: ["projectName", "artifactName"]
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
	writeFile: async ({ path, content, projectName }) => {
		const baseDir = `${config.paths.projects}/${projectName}`;
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

	readProjectFile: async ({ path, projectName }) => {
		const baseDir = `${config.paths.projects}/${projectName}`;
		const fullPath = `${baseDir}/${path}`;
		const data = await fs.readFile(fullPath, "utf8");
		return { status: "success", content: data };
	},

	addProjectArtifact: async ({ projectName, artifactName, content, taskId, agentRole }) => {
		const client = new MongoClient(config.db.uri, config.db.options);
		try {
			await client.connect();
			const db = client.db(config.db.dbName);
			await db.collection("artifacts").updateOne(
				{ projectName, artifactName },
				{ 
					$set: { 
						content, 
						taskId: taskId ? new ObjectId(taskId) : null,
						agentRole,
						updatedAt: new Date() 
					} 
				},
				{ upsert: true }
			);
			return { status: "success", message: `Artifact '${artifactName}' saved for project '${projectName}'.` };
		} finally {
			await client.close();
		}
	},

	readProjectArtifact: async ({ projectName, artifactName }) => {
		const client = new MongoClient(config.db.uri, config.db.options);
		try {
			await client.connect();
			const db = client.db(config.db.dbName);
			const artifact = await db.collection("artifacts").findOne({ projectName, artifactName });
			if (!artifact) {
				return { status: "error", message: `Artifact '${artifactName}' not found for project '${projectName}'.` };
			}
			return { status: "success", content: artifact.content };
		} finally {
			await client.close();
		}
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
				created: new Date()
			});

			return { status: "success", message: `Task assigned to ${to}` };
		} finally {
			await client.close();
		}
	}
};
