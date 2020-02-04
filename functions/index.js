const functions = require('firebase-functions');
const app = require('express')();
const  FBAuth  = require('./util/fbAuth');

const { getAllShouts, postOneShout } = require('./handlers/shouts');
const { signUp, logIn, uploadImage } = require('./handlers/users');


/****************** Shouts Routes ********************** */
app.get('/shouts', getAllShouts);
app.post('/shout', FBAuth, postOneShout);

/****************** Users Routes ********************** */
app.post('/signup', signUp);  
app.post('/login', logIn);
app.post('/user/image', FBAuth, uploadImage);


exports.api = functions.https.onRequest(app); // use .api for https://baseurl.com/api/