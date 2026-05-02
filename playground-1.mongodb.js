
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


// db.tasks.updateOne(
//   { _id: ObjectId("69f63cea6b9964ef9ee09fe3") },
//   { 
//     $set: { 
//       "status": "pending", 
//       "payload.userResponses": `
// 1. a
// 2. only those specified
// 3. all
// 4. a, c
// 5. e
// 6. c
// 7. a
// `
//     } 
//   }
// );
