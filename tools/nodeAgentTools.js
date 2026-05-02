import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { config } from "../config.js";

const execPromise = promisify(exec);

export const nodeTools = [
	{
		name: "writeFile",
		description: "Creates or overwrites a JavaScript/JSON file.",
		parameters: {
			type: "object",
			properties: {
				path: { type: "string", description: "Path including filename (e.g., 'src/app.js')" },
				content: { type: "string", description: "The JavaScript code or JSON string" }
			},
			required: ["path", "content"]
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
		description: "Reads the content of an existing file to understand the codebase.",
		parameters: {
			type: "object",
			properties: {
				path: { type: "string" }
			},
			required: ["path"]
		}
	}
];

// Implementation of the handlers
export const toolHandlers = {
	writeFile: async ({ path, content, projectName, isInternal = false }) => {
		const baseDir = isInternal ? config.paths.internal : `${config.paths.projects}/${projectName}`;
		fullPath = `${baseDir}/${path}`;

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
	
	readProjectFile: async ({ path }) => {
		const data = await fs.readFile(path, "utf8");
		return { status: "success", content: data };
	}
};