const functions = require('firebase-functions');
const app = require('express')();
const  FBAuth  = require('./util/fbAuth');

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
      getAuthenticatedUser 
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
app.get('/user', FBAuth, getAuthenticatedUser)

exports.api = functions.https.onRequest(app); // use .api for https://baseurl.com/api/