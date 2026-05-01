export const nodeSkills = {
	/**
	 * Skill: Scaffolds a professional Node.js project structure
	 */
	scaffoldProject: async (toolHandlers, projectName) => {
		console.log(`[Skill] Scaffolding ${projectName}...`);
		await toolHandlers.writeFile({
			path: "package.json",
			content: JSON.stringify({
				name: projectName,
				version: "1.0.0",
				type: "module", // ES6 support
				dependencies: { express: "^4.21.1" }
			}, null, 2)
		});
		await toolHandlers.runCommand({ command: "docker run --rm --network host npm install" });
		return "Project scaffolded with ES6 support.";
	},

	/**
	 * Skill: Iterative Debugging
	 * Runs code, catches error, and provides the error back to the LLM for fixing.
	 */
	debugAndRun: async (toolHandlers, entryPoint) => {
		const result = await toolHandlers.runCommand({ command: `docker run --rm --network host -it node ${entryPoint}` });
		if (result.status === "error") {
			return `CRASH DETECTED: ${result.message}. Please analyze the stack trace and suggest a fix.`;
		}
		return "Code executed successfully.";
	}
};