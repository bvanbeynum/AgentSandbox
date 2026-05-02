import fs from "fs/promises";
import { config } from "../config.js";

export const projectSetupTools = [
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

export const projectSetupToolHandlers = {
	createDirectoryStructure: async ({ directories, projectName }) => {
		const baseDir = `${config.paths.projects}/${projectName}`;
		for (const dir of directories) {
			const path = `${baseDir}/${dir}`;
			await fs.mkdir(path, { recursive: true });
		}
		return { status: "success", message: `Directories created for project ${projectName}: ${directories.join(", ")}` };
	}
};
