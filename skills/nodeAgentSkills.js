export const nodeSkills = {

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