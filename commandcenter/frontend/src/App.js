import React, { useState, useEffect } from 'react';

const Sidebar = ({ currentView, setView }) => (
	<nav className="sidebar">
		<div className="sidebar-header">
			<div>
				<div className="label-caps sidebar-admin-label">System Administrator</div>
				<div className="text-lg uppercase sidebar-glados-brand">GLaDOS</div>
				<div className="mono-data sidebar-node-control">NEURAL NODE CONTROL</div>
			</div>
		</div>
		<div className="nav-tabs">
			<a 
				href="#" 
				className={`nav-tab ${currentView === 'overview' ? 'active' : ''}`}
				onClick={(e) => { e.preventDefault(); setView('overview'); }}
			>
				<span className="material-symbols-outlined">dashboard</span>
				<span className="label-caps" style={{ fontSize: '11px' }}>Overview</span>
			</a>
			<a 
				href="#" 
				className={`nav-tab ${currentView === 'agents' ? 'active' : ''}`}
				onClick={(e) => { e.preventDefault(); setView('agents'); }}
			>
				<span className="material-symbols-outlined">precision_manufacturing</span>
				<span className="label-caps" style={{ fontSize: '11px' }}>Agents</span>
			</a>
			<a 
				href="#" 
				className={`nav-tab ${currentView === 'projects' ? 'active' : ''}`}
				onClick={(e) => { e.preventDefault(); setView('projects'); }}
			>
				<span className="material-symbols-outlined">grid_view</span>
				<span className="label-caps" style={{ fontSize: '11px' }}>Project Matrix</span>
			</a>
		</div>
		<div className="sidebar-footer">
			<a href="#" className="nav-tab">
				<span className="material-symbols-outlined">terminal</span>
				<span className="label-caps" style={{ fontSize: '10px' }}>Logs</span>
			</a>
		</div>
	</nav>
);

const Header = () => (
	<header className="top-header">
		<div className="header-brand-container">
			<span className="header-brand-text">AI COMMAND CENTER</span>
		</div>
		<div className="header-actions">
			<div className="status-container">
				<div className="status-pip bg-primary-cyan pulse"></div>
				<span className="mono-data status-text">STATUS: OPTIMAL</span>
			</div>
			<div className="header-icons">
				<span className="material-symbols-outlined header-icon">settings</span>
				<span className="material-symbols-outlined header-icon notification-container">
					notifications
					<span className="notification-dot"></span>
				</span>
			</div>
		</div>
	</header>
);

const Overview = ({ data }) => {
	const { stats, recentLogs } = data;
	return (
		<div className="grid-container">
			{/* Stat Cards */}
			<div className="bento-card stat-card stat-card-span-3">
				<div className="stat-card-header">
					<span className="label-caps">Total Agents</span>
					<span className="material-symbols-outlined stat-card-icon">memory</span>
				</div>
				<div className="mono-data stat-card-value">{stats?.totalAgents || 0}</div>
			</div>
			<div className="bento-card stat-card stat-card-span-3 stat-card-active">
				<div className="stat-card-header">
					<span className="label-caps text-primary-cyan">Active</span>
					<div className="sync-container">
						<div className="status-pip bg-primary-cyan"></div>
						<span className="mono-data sync-text">SYNC</span>
					</div>
				</div>
				<div className="mono-data stat-card-value">{stats?.activeTasks || 0}</div>
			</div>
			<div className="bento-card stat-card stat-card-span-3">
				<div className="stat-card-header">
					<span className="label-caps">Active Projects (24H)</span>
					<span className="material-symbols-outlined stat-card-icon">folder</span>
				</div>
				<div className="mono-data stat-card-value">03</div>
			</div>
			<div className="bento-card stat-card stat-card-span-3">
				<div className="stat-card-header">
					<span className="label-caps text-primary-cyan">Completed Tasks (24H)</span>
					<span className="material-symbols-outlined stat-card-icon-primary">check_circle</span>
				</div>
				<div className="mono-data stat-card-value">{stats?.completed24h || 0}</div>
			</div>

			{/* Main Charts / Data */}
			<div className="bento-card chart-card">
				 <div className="card-header-flex">
						<div className="flex-center-gap-8">
								<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>monitoring</span>
								<span className="label-caps">System Throughput</span>
						</div>
						<div className="flex-gap-8">
								<button className="mono-data btn-telemetry-filter">12H</button>
								<button className="mono-data btn-telemetry-filter-active">24H</button>
						</div>
				 </div>
				 <div className="histogram-container">
						{[40, 65, 80, 55, 70, 45, 30, 60, 85, 75, 90, 50].map((h, i) => (
								<div key={i} className="histogram-bar" style={{ height: `${h}%` }}></div>
						))}
				 </div>
			</div>

			<div className="bento-card activity-card">
				<div className="label-caps" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '8px', marginBottom: '16px' }}>Live Log Stream</div>
				<div className="mono-data log-stream-container">
						{recentLogs?.map((log, i) => (
								<div key={i} className="log-item">
										<span className="log-timestamp">[{new Date(log.created).toLocaleTimeString()}]</span>
										<span style={{ color: log.level === 'error' ? 'var(--error)' : 'var(--on-surface)' }}>{log.message}</span>
								</div>
						))}
						{recentLogs.length === 0 && <div style={{ color: 'var(--outline-variant)' }}>Awaiting telemetry...</div>}
				</div>
			</div>
		</div>
	);
};

const App = () => {
	const [view, setView] = useState('overview');
	const [data, setData] = useState({ stats: {}, recentLogs: [] });

	useEffect(() => {
		const fetchData = async () => {
				try {
						const res = await fetch('/api/overview');
						const json = await res.json();
						if (json.status === 200) {
								setData(json.data);
						}
				} catch (err) {
						console.error('Failed to fetch data:', err);
				}
		};
		fetchData();
		const interval = setInterval(fetchData, 5000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="app-container">
			<Sidebar currentView={view} setView={setView} />
			<Header />
			<main className="main-canvas">
				{view === 'overview' && <Overview data={data} />}
				{view === 'agents' && (
						<div className="bento-card">
								<div className="label-caps">Agent Fleet Management</div>
								<div className="mono-data view-placeholder-text">Querying neural nodes...</div>
						</div>
				)}
				{view === 'projects' && (
						<div className="bento-card">
								<div className="label-caps">Project Matrix Alignment</div>
								<div className="mono-data view-placeholder-text">Loading active initiatives...</div>
						</div>
				)}
			</main>
			<footer className="app-footer">
				<div className="mono-data footer-status-text">
						SYSTEM STATUS: NOMINAL // CORE 01 ACTIVE
				</div>
			</footer>
		</div>
	);
};

export default App;
