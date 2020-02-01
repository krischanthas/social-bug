const functions = require('firebase-functions');
const admin = require('firebase-admin'); 

// admin.initializeApp();
const express = require('express');


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

// middleware // authenticate user access token to identify login status. MUST be logged in to post shout.
const FBAuth = (request, response, next) => {
      let idToken;
      if(request.headers.authorization && request.headers.authorization.startsWith('Bearer ')) {
            idToken = request.headers.authorization.split('Bearer ')[1];
      } else { // no token, send error response
            console.error('No token found');
            return response.status(403).json({ error: 'Unauthorized'});
      }

      // check to make sure token was issued by this app
      admin.auth().verifyIdToken(idToken)
            .then(decodedToken => {
                  // add decoded user data to request object
                  request.user = decodedToken;
                  console.log(decodedToken);
                  // get user handle from collections
                  return db.collection('users')
                              .where('userId', '==', request.user.uid)
                              .limit(1)
                              .get();
            })
            .then(data => {
                  request.user.handle = data.docs[0].data().handle;
                  return next();
            })
            .catch(err => {
                  console.error('Error verifying token ', err);
                  return response.status(403).json(err);
            });
};

app.post('/shout', FBAuth, (request, response) => {
      if(request.body.body.trim() === '') {
            return response.status(400).json({body: 'Body must not be empty'});
      }
      const newShout = {
            body: request.body.body,
            userName: request.body.userName,
            createdAt: new Date().toISOString()
            // createdAt: admin.firestore.Timestamp.fromDate(new Date())
      };

      db.collection('shouts')
            .add(newShout)
            .then((doc) => {
                  return response.json({ message: `document ${doc.id} created successfully`});
            })
            .catch((err) => {
                  // change status code
                  response.status(500).json({ error: 'something went wrong'});
                  console.error(err);
            });
});

// Helper functions
const isEmpty = (string) => {
      if(string.trim() === '') {
            return true;
      } else  {
            return false;
      }
}
const isEmail = (email) => {
      const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      if(email.match(regEx)) {
            return true;
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

      /* New user validation */
      let errors = {}; // initialize errors object
      if(isEmpty(newUser.email)) {
            errors.email = 'Must not be empty';
      } else if (!isEmail(newUser.email)) {
            errors.email = 'Must be a valid email address';
      }
      if(isEmpty(newUser.password)) errors.password = 'Must not by empty';
      if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match';
      if(isEmpty(newUser.handle)) errors.handle = 'Must not be empty';
      // return errors object if errors exist
      if(Object.keys(errors).length > 0) return response.status(400).json(errors);

      let token, userId; // initialize token and userId variables
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

/* Login Route */
app.post('/login', (request, response) => {
      const user = {
            email: request.body.email,
            password: request.body.password
      };
      // validate
      let errors = {};
      if(isEmpty(user.email)){
            return errors.email = 'Must not be empty';
      } else if(!isEmail(user.email)) {
            return errors.email = 'Must be valid email address';
      } 
      if(isEmpty(user.password)) return errors.password = 'Must not be empty';
      if(Object.keys(errors).length > 0) return response.status(400).json(errors);

      // Continue logging in user
      firebase.auth().signInWithEmailAndPassword(user.email, user.password)
            .then(data => {
                  return data.user.getIdToken();
            })
            .then ((token) => {
                  return response.json({token});
            })
            .catch(err => {
                  console.error(err);
                  if(err.code === 'auth/wrong-password') {
                        return response.status(403).json({general: 'Wrong credentials, please try again'});
                  } else {
                        return response.status(500).json({error: err.code});
                  }
            })
});
exports.api = functions.https.onRequest(app); // use .api for https://baseurl.com/api/