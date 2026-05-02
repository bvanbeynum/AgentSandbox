import { toolHandlers as nodeHandlers } from "./tools/nodeAgentTools.js";
import { baToolHandlers } from "./tools/baAgentTools.js";
import { config } from "./config.js";
import fs from "fs/promises";

export const setupTools = [
	...nodeHandlers, // Includes writeFile, runCommand, readProjectFile
	{
		name: "createDirectoryStructure",
		description: "Creates multiple directories at once for project scaffolding.",
		parameters: {
			type: "object",
			properties: {
				directories: { 
					type: "array", 
					items: { type: "string" },
					description: "List of paths like ['src/models', 'src/routes']"
				}
			},
			required: ["directories"]
		}
	}
];

export const setupToolHandlers = {
	...nodeHandlers,
	...baToolHandlers,
	createDirectoryStructure: async ({ directories }) => {
		for (const dir of directories) {
			const path = `${config.agentDefaults.workspaceDir}/${dir}`;
			await fs.mkdir(path, { recursive: true });
		}
		return { status: "success", message: `Directories created: ${directories.join(", ")}` };
	}
};