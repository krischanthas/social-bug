const functions = require('firebase-functions');
const app = require('express')();
const  FBAuth  = require('./util/fbAuth');

const { getAllShouts, postOneShout, getShout, commentOnShout } = require('./handlers/shouts');
const { signUp, logIn, uploadImage, addUserDetails, getAuthenticatedUser } = require('./handlers/users');


/****************** Shouts Routes ********************** */
app.get('/shouts', getAllShouts);
app.post('/shout', FBAuth, postOneShout);
app.get('/shouts/:shoutId', getShout);
// todo: comment on a shout
app.post('/shout/:shoutId/comment', FBAuth, commentOnShout);
// todo: delete a shout
// todo: like a shout
// todo: unline a shout


/****************** Users Routes ********************** */
app.post('/signup', signUp);  
app.post('/login', logIn);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser)

exports.api = functions.https.onRequest(app); // use .api for https://baseurl.com/api/