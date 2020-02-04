const { db, admin } = require('../util/admin');
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

      const noImage = 'no-img.png';

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
                        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImage}?alt=media`,
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

exports.uploadImage = (request, response) => {
      const BusBoy = require('busboy');
      const path = require('path');
      const os = require('os');
      const fs = require('fs');

      const busboy = new BusBoy({ headers: request.headers});

      let imageFilename;
      let imageToBeUploaded = {};
      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
            // verify image
            if(mimetype !== 'image/jpg' && mimetype !== 'image/png') {
                  return response.status(400).json({error: 'Wrong file type submitted'});
            }

            // image.png <--
            const imageExtension = filename.split('.')[filename.split('.').length-1];
            // 123454345678.png
            imageFileName = `${Math.round(Math.random()*10000000000)}.${imageExtension}`;
            const filepath = path.join(os.tmpdir(), imageFileName);
            imageToBeUploaded = { filepath, mimetype };
            file.pipe(fs.createWriteStream(filepath));
      });

      busboy.on('finish', () => {
            // upload the file that was just created
            admin.storage().bucket().upload(imageToBeUploaded.filepath, {
                  resumable: false,
                  metadata: {
                        metadata: {
                              contentType: imageToBeUploaded.mimetype
                        }
                  }
            })
            .then(() => {
                  // construct image url to add it to our user documents
                  const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
                  return db.doc(`/users/${request.user.handle}`).update({ imageUrl });
            })
            .then(() => {
                  return response.json({ message: 'Image uploaded successfully'});
            })
            .catch((err) =>{
                  console.error(err);
                  return response.status(500).json({error: err.code});
            }); 
      });

      busboy.end(request.rawBody);
};