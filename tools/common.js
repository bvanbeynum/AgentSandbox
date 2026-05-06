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

	create_project_tasks: async ({ tasks, projectName }) => {
		const client = new MongoClient(config.db.uri, config.db.options);
		try {
			await client.connect();
			const db = client.db(config.db.dbName);

			const taskDocs = tasks.map(t => ({
				to: t.to, // Agent ID
				status: t.dependencies?.length > 0 ? "blocked" : "pending",
				payload: {
					instruction: t.instruction,
				},
				dependencies: t.dependencies || [], // [{ type: "task_completion", targetId: "temp_id" }]
				metadata: { projectName },
				tempId: t.id, // For resolving dependencies within the same batch
				created: new Date()
			}));

			const result = await db.collection("tasks").insertMany(taskDocs);
			
			// Resolve tempIds to real ObjectIds for dependencies within this batch
			const insertedDocs = await db.collection("tasks").find({ _id: { $in: Object.values(result.insertedIds) } }).toArray();
			const tempToRealId = {};
			insertedDocs.forEach(doc => {
				if (doc.tempId) tempToRealId[doc.tempId] = doc._id.toString();
			});

			for (const doc of insertedDocs) {
				if (doc.dependencies.length > 0) {
					const updatedDeps = doc.dependencies.map(d => {
						if (d.type === "task_completion" && tempToRealId[d.targetId]) {
							return { ...d, targetId: tempToRealId[d.targetId] };
						}
						return d;
					});
					await db.collection("tasks").updateOne({ _id: doc._id }, { $set: { dependencies: updatedDeps } });
				}
			}

			return { status: "success", message: `${tasks.length} tasks created.` };
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
	}
};
