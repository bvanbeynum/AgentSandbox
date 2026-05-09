import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { MongoClient, ObjectId } from "mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config.js";

const execPromise = promisify(exec);

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

	addProjectArtifact: async ({ projectName, artifactName, content, taskId, agentId }) => {
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
						agentId,
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

	assignTask: async ({ to, instruction, taskId, from, metadata }) => {
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

	createTask: async ({ to, instruction, metadata, dependencies }) => {
		const client = new MongoClient(config.db.uri, config.db.options);
		try {
			await client.connect();
			const db = client.db(config.db.dbName);

			const taskDoc = {
				to: to,
				status: (dependencies && dependencies.length > 0) ? "blocked" : "pending",
				payload: {
					instruction: instruction,
				},
				dependencies: dependencies || [],
				metadata: metadata || {},
				created: new Date()
			};

			const result = await db.collection("tasks").insertOne(taskDoc);
			
			return { 
				status: "success", 
				message: `Task created for ${to}. ID: ${result.insertedId}`,
				taskId: result.insertedId.toString()
			};
		} finally {
			await client.close();
		}
	},

	activate_skill: async ({ skillName }) => {
		const client = new MongoClient(config.db.uri, config.db.options);
		try {
			await client.connect();
			const db = client.db(config.db.dbName);
			const skill = await db.collection("skills").findOne({ name: skillName });
			if (!skill) return { status: "error", message: `Skill '${skillName}' not found.` };
			return { status: "success", instructions: skill.instructions };
		} finally {
			await client.close();
		}
	},

	read_session_summary: async ({ sessionId }) => {
		const client = new MongoClient(config.db.uri, config.db.options);
		try {
			await client.connect();
			const db = client.db(config.db.dbName);
			const session = await db.collection("sessions").findOne({ _id: new ObjectId(sessionId) });
			if (!session) return { status: "error", message: "Session not found." };
			return { status: "success", summary: session.summary, lastMessages: (session.messages || []).slice(-3) };
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
		return { status: "awaiting_user_input", message: "Waiting for user feedback.", breakLoop: true };
	},

	generateMockup: async ({ visualPrompt, projectName, artifactName }) => {
		return { status: "error", message: "Image generation is not supported by @google/generative-ai SDK." };
	},

	createDirectoryStructure: async ({ directories, projectName }) => {
		const baseDir = `${config.paths.projects}/${projectName}`;
		for (const dir of directories) {
			const path = `${baseDir}/${dir}`;
			await fs.mkdir(path, { recursive: true });
		}
		return { status: "success", message: `Directories created for project ${projectName}` };
	},

	browse: async ({ url }) => {
		let browser;
		try {
			browser = await chromium.launch({ headless: true });
			const context = await browser.newContext({
				userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
			});
			const page = await context.newPage();

			// Navigate and wait for content
			await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

			// Remove noisy elements
			await page.evaluate(() => {
				const tagsToRemove = ["script", "style", "nav", "footer", "iframe", "noscript", "header"];
				tagsToRemove.forEach(tag => {
					const elements = document.getElementsByTagName(tag);
					for (let i = elements.length - 1; i >= 0; i--) {
						elements[i].parentNode.removeChild(elements[i]);
					}
				});
			});

			const content = await page.content();
			const turndownService = new TurndownService({
				headingStyle: "atx",
				codeBlockStyle: "fenced"
			});
			
			const markdown = turndownService.turndown(content);

			return { 
				status: "success", 
				url, 
				content: markdown.substring(0, 30000) // Truncate to avoid context overflow
			};
		} catch (error) {
			return { status: "error", message: `Failed to browse ${url}: ${error.message}` };
		} finally {
			if (browser) await browser.close();
		}
	}
};
