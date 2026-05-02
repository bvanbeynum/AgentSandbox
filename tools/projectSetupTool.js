import fs from "fs/promises";
import { config } from "../config.js";

export const projectSetupTools = [
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

export const projectSetupToolHandlers = {
	createDirectoryStructure: async ({ directories }) => {
		for (const dir of directories) {
			const path = `${config.agentDefaults.workspaceDir}/${dir}`;
			await fs.mkdir(path, { recursive: true });
		}
		return { status: "success", message: `Directories created: ${directories.join(", ")}` };
	}
};
