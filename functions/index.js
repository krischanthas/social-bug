const functions = require('firebase-functions');
const admin = require('firebase-admin'); 
const express = require('express')
const app = express();

const serviceAccount = require("../socialbug-7d392-firebase-adminsdk-phg2v-7fe02f5942.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://socialbug-7d392.firebaseio.com"
});

// admin.initializeApp();

const firebase = require('firebase');
const firebaseConfig = {
      apiKey: "AIzaSyCJCATLF5YAjaAkJGgRZh9042me1u4H0dM",
      authDomain: "socialbug-7d392.firebaseapp.com",
      databaseURL: "https://socialbug-7d392.firebaseio.com",
      projectId: "socialbug-7d392",
      storageBucket: "socialbug-7d392.appspot.com",
      messagingSenderId: "845203122779",
      appId: "1:845203122779:web:22e4b240d564082ed52d7e",
      measurementId: "G-WSY5JXKGZ8"
    };
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();




/****************** Functions Below ********************** */
app.get('/shouts', (request, response) => {
      db.collection('shouts')
      .orderBy('createdAt', 'desc')
      .get()
      .then((data) => {
            let shouts = [];
            data.forEach(doc => {
                  shouts.push({
                        shoutId: doc.id,
                        body: doc.data().body,
                        userName: doc.data().userName,
                        createdAt: doc.data().createdAt
                  });
            });
            return response.json(shouts);
      })
      .catch((err) => console.error(err));
});

app.post('/shout', (request, response) => {
      const newShout = {
            body: request.body.body,
            userName: request.body.userName,
            createdAt: new Date().toISOString()
            // createdAt: admin.firestore.Timestamp.fromDate(new Date())
      };

      db.collection('shouts')
            .add(newShout)
            .then((doc) => {
                  response.json({ message: `document ${doc.id} created successfully`});
            })
            .catch((err) => {
                  // change status code
                  response.status(500).json({ error: 'something went wrong'});
                  console.error(err);
            });
});
// helper function for validating
const isEmpty = (string) => {
      if(string.trim() === '') {
            return true;
      } else  {
            return false;
      }
}

/* Signup route (User Regestration) */
app.post('/signup', (request, response) => {
      const newUser = {
            email: request.body.email,
            password: request.body.password,
            confirmPassword: request.body.confirmPassword,
            handle: request.body.handle,
      };

      let token, userId;
      db.doc(`/users/${newUser.handle}`).get()
            .then(doc => {
                  if(doc.exists) {
                       return response.status(400).json({ handle: 'this handle is already taken'});
                  } else {
                       return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
                  }; 
            })
            .then((data) => {
                  userId = data.user.uid;
                  return data.user.getIdToken();
            })
            .then(idToken => {
                  token = idToken;
                  const userCredentials = {
                        handle: newUser.handle,
                        email: newUser.email,
                        createdAt: new Date().toISOString(),
                        userId: userId
                  };
                  return db.doc(`/users/${newUser.handle}`).set(userCredentials);
            })
            .then(()=> {
                  return response.status(201).json({ token });
            })
            .catch(err => {
                  console.error(err);
                  if(err.code === 'auth/email-already-in-use') {
                        return response.status(400).json({email: 'Email is already in use'});
                  } else {
                        return response.status(500).json({ error: err.code });
                  };
            });
});


exports.api = functions.https.onRequest(app); // use .api for https://baseurl.com/api/