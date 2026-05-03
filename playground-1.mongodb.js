
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

db.tasks.find({});
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
