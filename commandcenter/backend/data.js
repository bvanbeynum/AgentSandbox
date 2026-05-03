import mongoose from 'mongoose';
import { config } from '../../config.js';

const { Schema } = mongoose;

const taskSchema = new Schema({
	to: { type: String, required: true },
	from: { type: String, required: true },
	status: { type: String, default: 'pending' },
	payload: { type: Object, required: true },
	metadata: { type: Object, default: {} },
	clarifications: { type: Array, default: [] },
	result: { type: Object },
	startedAt: { type: Date },
	completedAt: { type: Date },
	created: { type: Date, default: Date.now }
}, { collection: 'tasks' });

const logSchema = new Schema({
	taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
	agentRole: { type: String, required: true },
	level: { type: String, required: true },
	message: { type: String, required: true },
	context: { type: Object, default: {} },
	created: { type: Date, default: Date.now }
}, { collection: 'agentLogs' });

const artifactSchema = new Schema({
	projectName: { type: String, required: true },
	artifactName: { type: String, required: true },
	content: { type: Schema.Types.Mixed, required: true },
	taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
	agentRole: { type: String },
	metadata: { type: Object, default: {} },
	updatedAt: { type: Date },
	created: { type: Date, default: Date.now }
}, { collection: 'artifacts' });

const Task = mongoose.model('Task', taskSchema);
const Log = mongoose.model('Log', logSchema);
const Artifact = mongoose.model('Artifact', artifactSchema);

const sanitize = (doc) => {
	if (!doc) return doc;
	if (Array.isArray(doc)) return doc.map(sanitize);
	const sanitized = { ...doc };
	if (sanitized._id) {
		sanitized.id = sanitized._id.toString();
		delete sanitized._id;
	}
	if (sanitized.taskId && sanitized.taskId instanceof mongoose.Types.ObjectId) {
		sanitized.taskId = sanitized.taskId.toString();
	}
	delete sanitized.__v;
	return sanitized;
};

export const connectDB = async () => {
	try {
		await mongoose.connect(config.db.uri, {
			...config.db.options,
			dbName: config.db.dbName
		});
		console.log(`[${new Date().toISOString()}] [Data Layer] Connected to MongoDB: ${config.db.dbName}`);
	} catch (error) {
		console.error(`[${new Date().toISOString()}] [Data Layer] MongoDB Connection Error:`, error.message);
		process.exit(1);
	}
};

export const disconnectDB = async () => {
	await mongoose.disconnect();
	console.log(`[${new Date().toISOString()}] [Data Layer] Disconnected from MongoDB`);
};

export const dataLayer = {
	getTasks: async (filter = {}) => {
		try {
			const data = await Task.find(filter).sort({ created: -1 }).lean().exec();
			return { status: 200, data: sanitize(data) };
		} catch (error) {
			return { status: 560, error: error.message };
		}
	},
	getLogs: async (filter = {}, limit = 100) => {
		try {
			const data = await Log.find(filter).sort({ created: -1 }).limit(limit).lean().exec();
			return { status: 200, data: sanitize(data) };
		} catch (error) {
			return { status: 560, error: error.message };
		}
	},
	getArtifacts: async (filter = {}) => {
		try {
			const data = await Artifact.find(filter).sort({ created: -1 }).lean().exec();
			return { status: 200, data: sanitize(data) };
		} catch (error) {
			return { status: 560, error: error.message };
		}
	},
	getAgents: async () => {
		try {
			const agents = await Task.distinct('to').exec();
			const activeTasks = await Task.find({ status: 'active' }).select('to').exec();
			const activeAgentRoles = activeTasks.map(t => t.to);

			const roster = agents.map(role => ({
				id: role,
				role: role.toUpperCase(),
				status: activeAgentRoles.includes(role) ? 'online' : 'offline'
			}));

			return { status: 200, data: roster };
		} catch (error) {
			return { status: 560, error: error.message };
		}
	},
	getAgentDetails: async (role) => {
		try {
			const tasks = await Task.find({ to: role }).sort({ created: -1 }).limit(20).lean().exec();
			const logs = await Log.find({ agentRole: role }).sort({ created: -1 }).limit(50).lean().exec();
			
			// Infer artifacts from taskId or agentRole
			const artifacts = await Artifact.find({ 
				$or: [
					{ agentRole: role },
					{ taskId: { $in: tasks.map(t => t._id) } }
				]
			}).sort({ created: -1 }).lean().exec();

			// Construct history (projects they've worked on)
			const projectHistory = Array.from(new Set(tasks.map(t => t.metadata?.projectName).filter(Boolean))).map(projectName => {
				const projectTasks = tasks.filter(t => t.metadata?.projectName === projectName);
				const status = projectTasks.some(t => t.status === 'active') ? 'ACTIVE' : 'COMPLETED';
				return { id: projectName, status };
			});

			return {
				status: 200,
				data: {
					id: role,
					role: role.toUpperCase(),
					created: tasks.length > 0 ? tasks[tasks.length - 1].created : new Date(),
					lastActivity: tasks.length > 0 ? tasks[0].created : new Date(),
					project: tasks.length > 0 ? tasks[0].metadata?.projectName : 'NONE',
					history: projectHistory,
					artifacts: sanitize(artifacts).map(a => ({ name: a.artifactName, type: 'description' })),
					tasks: tasks.map(t => ({
						id: t.metadata?.projectName || 'TASK',
						desc: t.payload.instruction,
						time: t.created,
						active: t.status === 'active'
					})),
					recentLogs: sanitize(logs)
				}
			};
		} catch (error) {
			return { status: 560, error: error.message };
		}
	},
	getAgentStats: async () => {
		try {
			// Aggregation for quick overview stats
			const totalAgents = await Task.distinct('to').exec();
			const activeTasks = await Task.countDocuments({ status: 'active' }).exec();
			const completed24h = await Task.countDocuments({ 
				status: 'done', 
				completedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
			}).exec();
			
			return { 
				status: 200, 
				data: {
					totalAgents: totalAgents.length,
					activeTasks,
					completed24h
				} 
			};
		} catch (error) {
			return { status: 560, error: error.message };
		}
	}
};
