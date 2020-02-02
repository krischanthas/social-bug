const { db } = require('../util/admin');
const firebase = require('firebase');
const config = require('../util/config');
const { validateSignUpData, validateLogIn } = require('../util/validators'); 

firebase.initializeApp(config);

exports.signUp = (request, response) => {
      const newUser = {
            email: request.body.email,
            password: request.body.password,
            confirmPassword: request.body.confirmPassword,
            handle: request.body.handle,
      };

      const { valid, errors } = validateSignUpData(newUser);

      if(!valid) {
            return response.status(400).json(errors);
      }

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
};

exports.logIn = (request, response) => {
      const user = {
            email: request.body.email,
            password: request.body.password
      };
      // validate
      const { valid, errors } = validateLogIn(user);

      if(!valid) {
            return response.status(403).json(errors)
      }
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
};