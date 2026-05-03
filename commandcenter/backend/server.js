import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from './data.js';
import { api } from './api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 9201;
const IS_DEV = process.env.NODE_ENV === 'development';

app.use(express.json());

// API Routes
app.get('/api/overview', api.getOverview);
app.get('/api/tasks', api.getTasks);
app.get('/api/logs', api.getLogs);
app.get('/api/artifacts', api.getArtifacts);
app.get('/api/agents', api.getAgents);
app.get('/api/agents/:id', api.getAgentDetails);

const startServer = async () => {
	if (IS_DEV) {
		console.log(`[${new Date().toISOString()}] [Server] Running in Development Mode`);
		try {
			// Webpack Middleware
			const { default: webpack } = await import('webpack');
			const { default: webpackDevMiddleware } = await import('webpack-dev-middleware');
			const { default: webpackHotMiddleware } = await import('webpack-hot-middleware');
			const { default: webpackConfig } = await import('../frontend/webpack.dev.js');

			const compiler = webpack(webpackConfig);
			app.use(webpackDevMiddleware(compiler, {
				publicPath: webpackConfig.output.publicPath || '/',
			}));
			app.use(webpackHotMiddleware(compiler));
		} catch (err) {
			console.error('[Server] Failed to load Webpack middleware:', err.message);
		}
	} else {
		console.log(`[${new Date().toISOString()}] [Server] Running in Production Mode`);
		// Serve Static Files
		const distPath = path.join(__dirname, '../frontend/dist');
		app.use(express.static(distPath));
		app.get('*', (req, res) => {
			res.sendFile(path.join(distPath, 'index.html'));
		});
	}

	const server = app.listen(PORT, async () => {
		await connectDB();
		console.log(`[${new Date().toISOString()}] [Server] Command Center UI listening on port ${PORT}`);
	});

	// Graceful Shutdown
	const shutdown = async (signal) => {
		console.log(`\n[${new Date().toISOString()}] [Server] Received ${signal}. Shutting down...`);
		server.close(async () => {
			console.log(`[${new Date().toISOString()}] [Server] HTTP server closed`);
			await disconnectDB();
			process.exit(0);
		});
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer();
