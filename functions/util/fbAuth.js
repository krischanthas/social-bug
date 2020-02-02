const { admin } = require('./admin');

module.exports = (request, response, next) => {
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