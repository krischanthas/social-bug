const functions = require('firebase-functions');
const app = require('express')();
const  FBAuth  = require('./util/fbAuth');
const { db } = require('./util/admin');
const { 
      getAllShouts, 
      postOneShout, 
      getShout, 
      commentOnShout,
      likeShout,
      unlikeShout,
      deleteShout 
} = require('./handlers/shouts');

const { 
      signUp, 
      logIn, 
      uploadImage, 
      addUserDetails, 
      getAuthenticatedUser,
      getUserDetails,
      markNotificationsRead 
} = require('./handlers/users');


/****************** Shouts Routes ********************** */
app.get('/shouts', getAllShouts);
app.post('/shout', FBAuth, postOneShout);
app.get('/shouts/:shoutId', getShout);
app.post('/shout/:shoutId/comment', FBAuth, commentOnShout);
app.delete('/shout/:shoutId', FBAuth, deleteShout);
app.get('/shout/:shoutId/like', FBAuth, likeShout);
app.get('/shout/:shoutId/unlike', FBAuth, unlikeShout);

/****************** Users Routes ********************** */
app.post('/signup', signUp);  
app.post('/login', logIn);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/users/:handle', getUserDetails); // public route
app.post('/notifications', FBAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app); // use .api for https://baseurl.com/api/

/********************* Firestore Triggers ****************/
exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
      .onCreate((snap) =>{
            return db.doc(`/shouts/${snap.data().shoutId}`).get()
                        .then(doc => {
                              if(doc.exists && doc.data().userName !== snap.data().userName) {
                                    return db.doc(`/notifications/${snap.id}`).set({
                                          createdAt: new Date().toISOString(),
                                          recipient: doc.data().userName,
                                          sender: snap.data().userName,
                                          shoutId: doc.id,
                                          type: 'like',
                                          read: false
                                    });
                              }
                        })
                        .catch(err => {
                              console.error(err);
                        });
      });

exports.deleteNotificationOnUnlike = functions.firestore.document('likes/{id}')
      .onDelete((snap) => {
            return db.doc(`/notifications/${snap.id}`).delete()
                  .catch(err => {
                        console.error(err);
                        return;
                  });
      });

exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
      .onCreate((snap) =>{
            return db.doc(`/shouts/${snap.data().shoutId}`)
                  .get()
                  .then(doc => {
                        if(doc.exists && doc.data().userName !== snap.data().userName) {
                              return db.doc(`/notifications/${snap.id}`).set({
                                    createdAt: new Date().toISOString(),
                                    recipient: doc.data().userName,
                                    sender: snap.data().userName,
                                    shoutId: doc.id,
                                    type: 'comment',
                                    read: false
                              })
                        }
                  })
                  .catch(err => {
                        console.error(err);
                  });
});

exports.onUserImageChange = functions.firestore.document('/users/{userId}')
      .onUpdate((change) => {
            console.log(change.before.data());
            console.log(change.after.data());
            
            if(change.before.data().imageUrl !== change.after.data().imageUrl) {
                  console.log('image has changed');
                   // batch write
                  const batch = db.batch();
                  return db.collection('shouts').where('userName', '==', change.before.data().handle ).get()
                        .then(data => {
                              data.forEach( doc => {
                                    const shout = db.doc(`/shouts/${doc.id}`);
                                    batch.update(shout, { userImage: change.after.data().imageUrl });
                              });
                              return batch.commit();
                        });
            } else return true;
            
      });

exports.onShoutDelete = functions.firestore.document('shouts/{shoutId}')
      .onDelete( (snap, context) => {
            const shoutId = context.params.shoutId;
            const batch = db.batch();
            return db.collection('comments').where('shoutId', '==', shoutId).get()
                  .then(data => {
                        data.forEach(doc => {
                              batch.delete(db.doc(`/comments/${doc.id}`));
                        });
                        return db.collection('likes').where('shoutId', '==', shoutId).get();
                  })
                  .then(data => {
                        data.forEach(doc => {
                              batch.delete(db.doc(`/likes/${doc.id}`));
                        });
                        return db.collection('notifications').where('shoutId', '==', shoutId ).get();
                  })
                  .then(data => {
                        data.forEach(doc => {
                              batch.delete(db.doc(`/notifications/${doc.id}`));
                        });

                        batch.commit();
                  })
                  .catch(err => {
                        console.error(err);
                  })
      });