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

const Agents = () => {
	const [selectedAgent, setSelectedAgent] = useState('Agent_Arch_01');
	
	const agentRoster = [
		{ id: 'Agent_Arch_01', role: 'ARCHITECT', icon: 'architecture', status: 'online' },
		{ id: 'Agent_Dev_Alpha', role: 'DEVELOPER', icon: 'code', status: 'warning' },
		{ id: 'Agent_UIUX_04', role: 'DESIGNER', icon: 'brush', status: 'offline' },
	];

	const selectedAgentData = {
		id: selectedAgent,
		role: 'ARCHITECT',
		created: '2024.03.12 / 14:32:01',
		lastActivity: '2024.03.12 / 14:32:05',
		project: 'PRJ-BETA-42',
		history: [
			{ id: 'PRJ-ALPHA-99', status: 'COMPLETED', color: 'var(--outline)' },
			{ id: 'PRJ-BETA-42', status: 'ACTIVE', color: 'var(--primary-cyan)' },
			{ id: 'PRJ-GAMMA-01', status: 'PENDING', color: 'var(--alert-amber)' },
		],
		artifacts: [
			{ name: 'architecture_v2.md', type: 'description' },
			{ name: 'topology_map.png', type: 'image' },
			{ name: 'schema_definition.json', type: 'data_object' },
		],
		tasks: [
			{ id: 'PRJ-BETA-42', desc: 'Optimized database query routing logic.', time: 'T-MINUS 12 MIN', active: true },
			{ id: 'PRJ-BETA-42', desc: 'Generated revised API contract documentation.', time: 'T-MINUS 45 MIN' },
		]
	};

	return (
		<div className="grid-container" style={{ alignItems: 'start' }}>
			{/* Agent List Sidebar */}
			<aside className="agent-roster-sidebar">
				<h2 className="roster-header uppercase">AGENT ROSTER</h2>
				{agentRoster.map(agent => (
					<button 
						key={agent.id}
						className={`roster-btn ${selectedAgent === agent.id ? 'roster-btn-active' : ''}`}
						onClick={() => setSelectedAgent(agent.id)}
					>
						<div className="flex-center-gap-8">
							<span className="material-symbols-outlined text-primary-cyan" style={{ fontSize: '20px' }}>{agent.icon}</span>
							<div>
								<div className="label-caps" style={{ fontSize: '10px', color: 'var(--on-surface)' }}>{agent.id}</div>
								<div className="mono-data" style={{ fontSize: '10px', color: 'var(--outline)', lineHeight: 1 }}>ROLE: {agent.role}</div>
							</div>
						</div>
						<div className="status-pip" style={{ backgroundColor: agent.status === 'online' ? 'var(--primary-cyan)' : agent.status === 'warning' ? 'var(--alert-amber)' : 'var(--outline)' }}></div>
					</button>
				))}
			</aside>

			{/* Drill-down View */}
			<div className="agent-drill-down">
				{/* Agent Header */}
				<header className="agent-header">
					<div>
						<h1 className="headline-lg uppercase" style={{ margin: 0, fontSize: '32px' }}>{selectedAgentData.id}</h1>
						<div className="agent-meta-container">
							<div className="agent-meta-item">
								<span className="material-symbols-outlined text-primary-cyan" style={{ fontSize: '14px' }}>engineering</span>
								<span className="uppercase">ROLE: {selectedAgentData.role}</span>
							</div>
							<span style={{ color: 'var(--outline-variant)' }}>/</span>
							<div className="agent-meta-item">
								<span className="material-symbols-outlined text-primary-cyan" style={{ fontSize: '14px' }}>calendar_today</span>
								<span className="uppercase">CREATED: {selectedAgentData.created}</span>
							</div>
							<span style={{ color: 'var(--outline-variant)' }}>/</span>
							<div className="agent-meta-item">
								<span className="material-symbols-outlined text-primary-cyan" style={{ fontSize: '14px' }}>history</span>
								<span className="uppercase">LAST ACTIVITY: {selectedAgentData.lastActivity}</span>
							</div>
							<span style={{ color: 'var(--outline-variant)' }}>/</span>
							<div className="agent-meta-item">
								<span className="material-symbols-outlined text-primary-cyan" style={{ fontSize: '14px' }}>folder</span>
								<span className="uppercase">PROJECT: {selectedAgentData.project}</span>
							</div>
						</div>
					</div>
				</header>

				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gutter)' }}>
					{/* Project History */}
					<section className="bento-card">
						<h2 className="label-caps flex-center-gap-8" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
							<span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span> PROJECT HISTORY
						</h2>
						<ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
							{selectedAgentData.history.map((h, i) => (
								<li key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: i < 2 ? '1px solid var(--outline-variant)' : 'none', paddingBottom: '8px' }}>
									<span className="mono-data" style={{ fontSize: '12px' }}>{h.id}</span>
									<span className="mono-data" style={{ fontSize: '10px', color: h.color }}>{h.status}</span>
								</li>
							))}
						</ul>
					</section>

					{/* Artifact Repository */}
					<section className="bento-card">
						<h2 className="label-caps flex-center-gap-8" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
							<span className="material-symbols-outlined" style={{ fontSize: '16px' }}>folder_open</span> ARTIFACT REPOSITORY
						</h2>
						<div className="artifact-grid">
							{selectedAgentData.artifacts.map((art, i) => (
								<a key={i} href="#" className="artifact-link">
									<span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--outline)' }}>{art.type}</span>
									<span className="mono-data" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{art.name}</span>
								</a>
							))}
						</div>
					</section>
				</div>

				{/* Recent Task Stream */}
				<section className="bento-card">
					<h2 className="label-caps flex-center-gap-8" style={{ color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
						<span className="material-symbols-outlined" style={{ fontSize: '16px' }}>stream</span> RECENT TASK STREAM
					</h2>
					<div className="timeline-container">
						{selectedAgentData.tasks.map((task, i) => (
							<div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
								<div className={`timeline-node ${task.active ? 'timeline-node-active' : ''}`} style={{ top: '4px' }}></div>
								<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
									<span className="mono-data" style={{ fontSize: '10px', backgroundColor: 'var(--surface-variant)', padding: '0 4px', border: '1px solid var(--outline-variant)' }}>{task.id}</span>
									<span className="mono-data" style={{ fontSize: '12px' }}>{task.desc}</span>
								</div>
								<span className="mono-data" style={{ fontSize: '10px', color: 'var(--outline)' }}>{task.time}</span>
							</div>
						))}
					</div>
				</section>

				{/* Work Log Terminal */}
				<section className="terminal-container">
					<div className="terminal-header">
						<span className="mono-data uppercase" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>WORK LOG STREAM :: LIVE</span>
						<div style={{ display: 'flex', gap: '4px' }}>
							<div className="status-pip bg-alert-amber" style={{ opacity: 0.5 }}></div>
							<div className="status-pip bg-primary-cyan" style={{ opacity: 0.8 }}></div>
						</div>
					</div>
					<div className="terminal-log-stream mono-data">
						<div className="flex-gap-8"><span style={{ color: 'var(--outline)' }}>[14:32:01]</span> <span>Initiating analysis of user authentication flow...</span></div>
						<div className="flex-gap-8"><span style={{ color: 'var(--outline)' }}>[14:32:05]</span> <span className="text-primary-cyan">Identified potential bottleneck in token validation.</span></div>
						<div className="flex-gap-8"><span style={{ color: 'var(--outline)' }}>[14:32:12]</span> <span>Drafting proposed structural changes...</span></div>
						<div className="flex-gap-8"><span style={{ color: 'var(--outline)' }}>[14:32:45]</span> <span>Awaiting peer review from Agent_Dev_Alpha.</span></div>
						<div className="flex-gap-8" style={{ marginTop: '8px' }}>
							<span className="text-primary-cyan">&gt;_</span>
							<span className="terminal-cursor pulse"></span>
						</div>
					</div>
				</section>
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
				{view === 'agents' && <Agents />}
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
