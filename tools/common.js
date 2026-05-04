import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { MongoClient, ObjectId } from "mongodb";
import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";

const execPromise = promisify(exec);

export const allTools = [
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
	},
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
		name: "generateMockup",
		description: "Generates an image mockup based on a visual prompt and saves it to the project directory.",
		parameters: {
			type: "object",
			properties: {
				visualPrompt: { type: "string", description: "Detailed descriptive prompt for the image generation model." },
				projectName: { type: "string" },
				artifactName: { type: "string", description: "Filename for the mockup (e.g., 'main-ui-mockup')" }
			},
			required: ["visualPrompt", "projectName", "artifactName"]
		}
	},
	{
		name: "createDirectoryStructure",
		description: "Creates multiple directories at once for project scaffolding in the project directory.",
		parameters: {
			type: "object",
			properties: {
				directories: { 
					type: "array", 
					items: { type: "string" },
					description: "List of paths like ['src/models', 'src/routes']"
				},
				projectName: { type: "string" }
			},
			required: ["directories", "projectName"]
		}
	}
];

export const allHandlers = {
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
	},

	askClarifyingQuestions: async ({ questions, taskId }) => {
		const client = new MongoClient(config.db.uri);
		await client.connect();
		const db = client.db(config.db.dbName);

		await db.collection("tasks").updateOne(
			{ _id: new ObjectId(taskId) },
			{ 
				$set: { status: "awaiting_user_input" },
				$push: { 
					clarifications: { 
						questions: questions, 
						answer: null, 
						timestamp: new Date() 
					} 
				}
			}
		);
		await client.close();
		// breakLoop: true signals the DynamicAgent reasoning loop to stop and wait
		return { status: "awaiting_user_input", message: "Waiting for user feedback.", breakLoop: true };
	},

	generateMockup: async ({ visualPrompt, projectName, artifactName }) => {
		const genAI = new GoogleGenAI(config.ai.key);
		
		try {
			const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

			const result = await model.generateImages({
				prompt: visualPrompt,
				numberOfImages: 1,
				safetySettings: [
					{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
					{ category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
					{ category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
					{ category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
				],
			});

			if (!result.images || result.images.length === 0) {
				return { status: "error", message: "No image was generated by the model." };
			}

			const baseDir = `${config.paths.projects}/${projectName}/mockups`;
			await fs.mkdir(baseDir, { recursive: true });

			const filePath = path.join(baseDir, `${artifactName}.png`);
			const imageBuffer = Buffer.from(result.images[0].base64, "base64");
			
			await fs.writeFile(filePath, imageBuffer);

			return { 
				status: "success", 
				message: `Mockup generated and saved to ${filePath}`,
				path: filePath
			};
		} catch (error) {
			console.error("Image Generation Error:", error);
			return { status: "error", message: `Failed to generate mockup: ${error.message}` };
		}
	},

	createDirectoryStructure: async ({ directories, projectName }) => {
		const baseDir = `${config.paths.projects}/${projectName}`;
		for (const dir of directories) {
			const path = `${baseDir}/${dir}`;
			await fs.mkdir(path, { recursive: true });
		}
		return { status: "success", message: `Directories created for project ${projectName}: ${directories.join(", ")}` };
	}
};
