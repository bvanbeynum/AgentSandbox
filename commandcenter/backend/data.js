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
	name: { type: String, required: true },
	type: { type: String, required: true },
	content: { type: Schema.Types.Mixed, required: true },
	metadata: { type: Object, default: {} },
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
