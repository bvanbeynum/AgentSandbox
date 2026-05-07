import { MongoClient } from "mongodb";
import { config } from "../config.js";
import { DynamicAgent } from "./agentCore.js";

async function main() {
	console.log("Starting Dynamic Agent Runner...");

	const client = new MongoClient(config.db.uri, config.db.options);
	
	try {
		await client.connect();
		const db = client.db(config.db.dbName);
		const agentsCollection = db.collection("agents");
		const agentToolsCollection = db.collection("agentTools");
		const modelsCollection = db.collection("models");

		// Fetch all tool definitions
		const activeToolDefs = await agentToolsCollection.find({
			$or: [
				{ inactiveDate: { $exists: false } },
				{ inactiveDate: null }
			]
		}).toArray();

		const mappedTools = activeToolDefs.map(doc => ({
			name: doc.name,
			description: doc.description,
			parameters: doc.parameters
		}));

		// Fetch all model definitions
		const allModels = await modelsCollection.find({}).toArray();
		const modelsMap = new Map(allModels.map(m => [m._id.toString(), m]));

		// Fetch all agents that are not inactive
		const activeAgents = await agentsCollection.find({
			$or: [
				{ inactiveDate: { $exists: false } },
				{ inactiveDate: null }
			]
		}).toArray();

		if (activeAgents.length === 0) {
			console.warn("No active agents found in the database.");
			process.exit(0);
		}

		console.log(`Initializing ${activeAgents.length} agents...`);

		for (const agentData of activeAgents) {
			const { _id, name, instructions, tools, modelId } = agentData;

			console.log(`Starting agent: ${name} (${_id})`);

			// Resolve model config
			const modelConfig = modelsMap.get(modelId?.toString());
			if (!modelConfig) {
				console.warn(`[${name}] Warning: No model configuration found for ID ${modelId}. Agent may fail to call AI.`);
			}

			// Map string names to full tool objects from the database
			const agentToolsArray = tools || [];
			const agentTools = mappedTools.filter(tool => agentToolsArray.includes(tool.name));

			const agent = new DynamicAgent(_id.toString(), name, instructions, agentTools, [], modelConfig);
			
			// Initialize is async and starts listening (change streams)
			// We don't await it to block, but we want to catch errors
			agent.initialize().catch(err => {
				console.error(`Failed to initialize agent [${name}]:`, err.message);
			});
		}

		console.log("All agents initialized and listening for tasks.");
		
		// Dependency Resolver logic
		const tasksCollection = db.collection("tasks");
		const artifactsCollection = db.collection("artifacts");

		const resolveDependencies = async () => {
			console.log("Starting Dependency Resolver...");
			
			const changeStream = tasksCollection.watch([
				{ $match: { "updateDescription.updatedFields.status": "done" } }
			], { fullDocument: "updateLookup" });

			changeStream.on("change", async (event) => {
				const finishedTaskId = event.fullDocument._id.toString();
				console.log(`Task ${finishedTaskId} completed. Checking for unblocked tasks...`);

				// Find tasks blocked by this task
				const blockedTasks = await tasksCollection.find({
					status: "blocked",
					"dependencies.targetId": finishedTaskId,
					"dependencies.type": "task_completion"
				}).toArray();

				for (const task of blockedTasks) {
					// Check if all dependencies are met
					const allMet = await checkDependencies(task, tasksCollection, artifactsCollection);
					if (allMet) {
						await tasksCollection.updateOne({ _id: task._id }, { $set: { status: "pending" } });
						console.log(`Task ${task._id} unblocked and set to pending.`);
					}
				}
			});

			// Also watch artifacts
			const artifactStream = artifactsCollection.watch([], { fullDocument: "updateLookup" });
			artifactStream.on("change", async (event) => {
				const artifactName = event.fullDocument.artifactName;
				console.log(`Artifact ${artifactName} updated. Checking for unblocked tasks...`);

				const blockedTasks = await tasksCollection.find({
					status: "blocked",
					"dependencies.targetId": artifactName,
					"dependencies.type": "artifact_creation"
				}).toArray();

				for (const task of blockedTasks) {
					const allMet = await checkDependencies(task, tasksCollection, artifactsCollection);
					if (allMet) {
						await tasksCollection.updateOne({ _id: task._id }, { $set: { status: "pending" } });
						console.log(`Task ${task._id} unblocked and set to pending.`);
					}
				}
			});
		};

		async function checkDependencies(task, tasksCollection, artifactsCollection) {
			for (const dep of task.dependencies) {
				if (dep.type === "task_completion") {
					const target = await tasksCollection.findOne({ _id: new ObjectId(dep.targetId) });
					if (!target || target.status !== "done") return false;
				} else if (dep.type === "artifact_creation") {
					const target = await artifactsCollection.findOne({ 
						projectName: task.metadata.projectName, 
						artifactName: dep.targetId 
					});
					if (!target) return false;
				}
			}
			return true;
		}

		resolveDependencies().catch(err => console.error("Dependency Resolver Error:", err));

		// Keep the process alive
		process.on("SIGINT", async () => {
			console.log("Shutting down...");
			await client.close();
			process.exit(0);
		});

	} catch (error) {
		console.error("Critical error in Dynamic Agent Runner:", error.message);
		process.exit(1);
	}
}

main();
