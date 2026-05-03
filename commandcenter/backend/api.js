import { dataLayer } from './data.js';

export const api = {
	getOverview: async (req, res) => {
		const stats = await dataLayer.getAgentStats();
		if (stats.status !== 200) return res.status(stats.status).json(stats);
		
		const recentLogs = await dataLayer.getLogs({}, 10);
		if (recentLogs.status !== 200) return res.status(recentLogs.status).json(recentLogs);

		res.status(200).json({
			status: 200,
			data: {
				stats: stats.data,
				recentLogs: recentLogs.data
			}
		});
	},
	getTasks: async (req, res) => {
		const result = await dataLayer.getTasks(req.query);
		res.status(result.status).json(result);
	},
	getLogs: async (req, res) => {
		const result = await dataLayer.getLogs(req.query, parseInt(req.query.limit) || 100);
		res.status(result.status).json(result);
	},
	getArtifacts: async (req, res) => {
		const result = await dataLayer.getArtifacts(req.query);
		res.status(result.status).json(result);
	},
	getAgents: async (req, res) => {
		const result = await dataLayer.getAgents();
		res.status(result.status).json(result);
	},
	getAgentDetails: async (req, res) => {
		const result = await dataLayer.getAgentDetails(req.params.id);
		res.status(result.status).json(result);
	}
};
