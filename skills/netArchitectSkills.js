// skills/networkSkills.js
import { exec } from "child_process";
import { promisify } from "util";
const execPromise = promisify(exec);

export const networkSkills = {
	checkRemoteDatabaseLatency: async (host) => {
		try {
			// Pings the remote DB to check latency for the plan
			const { stdout } = await execPromise(`ping -c 3 ${host}`);
			return `Connection verified. Latency stats: ${stdout}`;
		} catch (error) {
			return `Warning: Remote host ${host} is unreachable. Ensure the Pi's VPN/Firewall allows 27017.`;
		}
	}
};