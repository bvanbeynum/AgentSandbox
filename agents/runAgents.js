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
			const { agentName, instructions, tools } = agentData;
			
			console.log(`Starting agent: ${agentName}`);
			const agent = new DynamicAgent(agentName, instructions, tools || []);
			
			// Initialize is async and starts listening (change streams)
			// We don't await it to block, but we want to catch errors
			agent.initialize().catch(err => {
				console.error(`Failed to initialize agent [${agentName}]:`, err.message);
			});
		}

		console.log("All agents initialized and listening for tasks.");
		
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
