
use("agentSandbox");

// db.tasks.insertOne({
//   to: "Business Analyst",
//   status: "pending",
//   payload: { 
//     instruction: `
// Build an app that will allow the user to upload a screenshot
// of a wrestling dual book page, and then call Gemini to translate
// the image into structured data. The structured data should include
// the opponent team name, each weight class, the two wrestlers, each move
// and the points (T3, N4, etc) and the final score for the match.
// `
//   },
//   metadata: { 
//     projectName: "scorebook"
//   },
//   created: new Date(),
//   modified: new Date()
// });

db.tasks.find({"metadata.projectName": "scorebook"}, {}, { sort: { created: -1 } });
// db.agentLogs.find({taskId: "69f94dc668975d4e69d86ee5"}).sort({ created: -1 });
// db.agents.find({}).sort({ created: 1 });

// db.tasks.deleteMany({_id: ObjectId("69f94dc668975d4e69d86ee5")});
// db.agentLogs.deleteMany({taskId: "69f94dc668975d4e69d86ee5"});
// db.artifacts.deleteMany({});

// db.tasks.updateOne(
//   { _id: ObjectId("69f8d9c6b29831a485dcf4a3") },
//   { 
// 	$set: { 
// 	  "status": "pending",
// 	  "result": null
// 	}
// });

// db.tasks.updateOne(
//   { _id: ObjectId("69f94dc668975d4e69d86ee5") },
//   { 
//     $set: { 
//       "status": "pending", 
//       "payload.userResponses": `
// 1. a
// 2. a
// 3. a
// 4. a
// 5. a
// 6. a
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

// db.agentTools.insertOne({
// 	name: "createDirectoryStructure",
// 	description: "Creates multiple directories at once for project scaffolding in the project directory.",
// 	parameters: {
// 		type: "object",
// 		properties: {
// 			directories: { 
// 				type: "array", 
// 				items: { type: "string" },
// 				description: "List of paths like ['src/models', 'src/routes']"
// 			},
// 			projectName: { type: "string" }
// 		},
// 		required: ["directories", "projectName"]
// 	},
// 	created: new Date(),
// 	modified: new Date(),
// 	inactiveDate: null
// });

// db.agentTools.find({}, {}, { sort: { created: -1 } });
