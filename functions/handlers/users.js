const { db, admin } = require('../util/admin');
const firebase = require('firebase');
const config = require('../util/config');
const { validateSignUpData, validateLoginData, reduceUserDetails } = require('../util/validators'); 

firebase.initializeApp(config);

/* User Registration */
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
                        return response.status(500).json({ general: 'Something went wrong, please try again'});
                  };
            });
};

/* Login User In */
exports.logIn = (request, response) => {
      const user = {
            email: request.body.email,
            password: request.body.password
      };
      // validate
      const { valid, errors } = validateLoginData(user);

      if(!valid) {
            return response.status(400).json(errors);
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
                  return response.status(403).json({general: 'Wrong credentials, please try again'});
            });
};


/* Add User Details */
exports.addUserDetails = (request, response) => {
      let userDetails = reduceUserDetails(request.body);
      
      db.doc(`/users/${request.user.handle}`).update(userDetails)
            .then(() => {
                  return response.json({ message: 'Details added successfully'});
            })
            .catch(err => {
                  console.error(err);
                  return response.status(500).json({ error: err.code});
            });
};

/* Get Any User's Details */
exports.getUserDetails = (request, response) => {
      const userData = {};
      db.doc(`/users/${request.params.handle}`).get()
            .then(doc => {
                  if(doc.exists) {
                        userData.user = doc.data();
                        return db.collection(`shouts`)
                              .where('userName', '==', request.params.handle)
                              .orderBy('createdAt', 'desc')
                              .get();
                  } else {
                        return response.status(404).json({error: 'User not found'});
                  }
            })
            .then(data => {
                  userData.shouts = [];
                  data.forEach(doc => {
                        userData.shouts.push({
                              body: doc.data().body,
                              createdAt: doc.data().createdAt,
                              userName: doc.data().userName,
                              userImage: doc.data().userImage,
                              likeCount: doc.data().likeCount,
                              commentCount: doc.data().commentCount,
                              shoutId: doc.id
                        });
                  });
                  return response.json(userData);
            })
            .catch(err => {
                  console.error(err);
                  return response.status(500).json({error: err.code});
            });
};

/* Get Authenticated User */
exports.getAuthenticatedUser = (request, response) => {
      let userData = {};
      db.doc(`/users/${request.user.handle}`).get()
            .then(doc => {
                  if(doc.exists) {
                        userData.credentials = doc.data();
                        return db.collection('likes').where('userName', '==', request.user.handle).get();
                  }
            })
            .then(data => {
                  userData.likes = [];
                  data.forEach(doc => {
                        userData.likes.push(doc.data());
                  });
                  return db.collection ('notifications')
                        .where('recipient', '==', request.user.handle )
                        .orderBy('createdAt', 'desc').limit(10).get();

            })
            .then(data => {
                  userData.notifications = [];
                  data.forEach(doc => {
                        userData.notifications.push({
                              recipient: doc.data().recipient,
                              sender: doc.data().sender,
                              createdAt: doc.data().createdAt,
                              shoutId: doc.data().shoutId,
                              type: doc.data().type,
                              read: doc.data().read,
                              notificationsId: doc.id
                        });
                  });
                  return response.json(userData);
            })
            .catch(err => {
                  console.error(err);
                  return response.status(500).json({ error: err.code});
            })

}

/* Upload User Profile Image */
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
            if(mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
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

/* Mark Notification As Read */
exports.markNotificationsRead = (request,response) => {
      // execute batch (on multiple docs) write
      let batch = db.batch();
      request.body.forEach(notificationId => {
            const notification = db.doc(`/notifications/${notificationId}`);
            batch.update(notification, { read: true });
      });
      
      batch.commit()
            .then(() => {
                  return response.json({ message: 'Notifications marked read'});
            })
            .catch(err => {
                  console.error(err);
                  return response.status(500).json({ error: err.code });
            });
};