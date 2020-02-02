const admin = require('firebase-admin'); 
// admin.initializeApp();

/* Below is used for executing firebase serve at localhost */
const serviceAccount = require("../../socialbug-7d392-firebase-adminsdk-phg2v-7fe02f5942.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://socialbug-7d392.firebaseio.com"
});

const db = admin.firestore();

// export to other files
module.exports = { admin, db };