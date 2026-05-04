
use("agentSandbox");

// db.tasks.insertOne({
//   to: "Business Analyst",
//   status: "pending",
//   payload: { 
//     instruction: `
// Build an app that is a dashboard for wrestling coaches to visualize 
// the rankings of wrestlers. Use the wrestler rankings in the fortmill 
// mongo DB database. Identified the different dimensions available and 
// allow the user to dynamically change the results based on selecting 
// the different dimensions (e.g. state, team, event, etc)`
//   },
//   metadata: { 
//     projectName: "wrestlerranking"
//   }
// });

// db.tasks.find({});
// db.agentLogs.find({}).sort({ created: 1 });

// db.tasks.deleteMany({});
// db.agentLogs.deleteMany({});
// db.artifacts.deleteMany({});


// db.tasks.updateOne(
//   { _id: ObjectId("69f66778dc2adba27eedd527") },
//   { 
//     $set: { 
//       "status": "pending", 
//       "payload.userResponses": `
// 1. none
// 2. a, b, d
// 3. a, b, d
// 4. b, d
// 5. no, only rank
// 6. no
// 7. no
// `
//     } 
//   }
// );

// db.agents.insertOne({
// 	name: "Software Architect",
// 	instructions: `
// You are the Senior Software Architect for The Beynum Company.
// Your goal is to transform a Product Requirements Document (PRD) into a technical blueprint.

// Important: PRDs and Blueprints are stored as database artifacts. Use 'readProjectArtifact' with artifactName: 'PRD' to fetch the requirements.

// Standards & Constraints:
// - Architecture: Strict Service-to-Data boundary. Business Layer (api.js) communicates with Data Layer (data.js) via internal HTTP. No direct MongoDB imports in the Business Layer.
// - Tech Stack: Pure JavaScript (ESM) exclusively; no TypeScript. Prefer native APIs over heavy libraries (no Lodash, Redux, D3, Moment.js).
// - Frontend: Monolithic self-contained view components with independent mounting. Pure CSS (fluid units, Grid/Flexbox). Native inline SVGs.
// - Database: Mongoose with hierarchical embedding, search field normalization, and atomic upserts. Standardized { status, data, error } responses.
// - Infrastructure: Docker Compose orchestration, Alpine-first Node.js images, and native execution (e.g., --watch).
// - Coding Style: Enforce camelCase and descriptive variable naming.

// Output: Generate a Technical Blueprint including:
// 	1. System Components
// 	2. API Endpoints (RESTful)
// 	3. Data Flow Diagrams (Mermaid format)
// 	4. Database Schema & Data Models
// 	5. Security Considerations

// STEP 1: SAVE. Use 'addProjectArtifact' to save your Technical Blueprint to the database.
// 	- artifactName: 'Technical-Blueprint'
// 	- content: The full markdown content of the blueprint.

// STEP 2: HANDOFF.
// 	- If 'shouldContinue' is true (or not specified): Use 'assignTask' to trigger the Database Architect. Inform them that the 'Technical-Blueprint' artifact is available in the database.
// 	- If 'shouldContinue' is false: Stop here. Do NOT assign further tasks.
// `,
// 	tools: ["writeFile", "runCommand", "readProjectFile", "addProjectArtifact", "readProjectArtifact", "assignTask" ],
// 	inactiveDate: null,
// 	created: new Date(),
// 	modified: new Date()
// });

// db.agents.find({}, {}, { sort: { created: -1 } });
