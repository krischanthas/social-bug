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

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
      .onCreate((snap) =>{
            db.doc(`/shouts/${snap.data().shoutId}`).get()
                  .then(doc => {
                        if(doc.exists) {
                              return db.doc(`/notifications/${snap.id}`).set({
                                    createdAt: new Date().toISOString(),
                                    recipient: doc.data().userName,
                                    sender: snap.data().userName,
                                    shoutId: doc.id,
                                    type: 'like',
                                    read: false
                              })
                        }
                  })
                  .then(() => {
                        return;
                  })
                  .catch(err => {
                        console.error(err);
                        return; // no need to send back response since this is an db trigger not an api endpoint
                  });
      });

exports.deleteNotificationOnUnlike = functions.firestore.document('likes/{id}')
      .onDelete((snap) => {
            db.doc(`/notifications/${snap.id}`).delete()
            .then(() => {
                  return;
            })
            .catch(err => {
                  console.error(err);
                  return;
            });
      });

exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
      .onCreate((snap) =>{
            db.doc(`/shouts/${snap.data().shoutId}`)
            .get()
            .then(doc => {
                  if(doc.exists) {
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
            .then(() => {
                  return;
            })
            .catch(err => {
                  console.error(err);
                  return; // no need to send back response since this is an db trigger not an api endpoint
            });
});