const functions = require('firebase-functions');
const app = require('express')();
const  FBAuth  = require('./util/fbAuth');

const { getAllShouts, postOneShout } = require('./handlers/shouts');
const { signUp, logIn, uploadImage, addUserDetails, getAuthenticatedUser } = require('./handlers/users');


/****************** Shouts Routes ********************** */
app.get('/shouts', getAllShouts);
app.post('/shout', FBAuth, postOneShout);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser)
/****************** Users Routes ********************** */
app.post('/signup', signUp);  
app.post('/login', logIn);


exports.api = functions.https.onRequest(app); // use .api for https://baseurl.com/api/