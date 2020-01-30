const functions = require('firebase-functions');
const admin = require('firebase-admin'); 
admin.initializeApp();
const express = require('express');
const app = express();

app.get('/shouts', (request, response) => {
      admin.firestore().collection('shouts')
      .orderBy('createdAt', 'desc')
      .get()
      .then((data) => {
            let shouts = [];
            data.forEach(doc => {
                  shouts.push({
                        shoutId: doc.id,
                        body: doc.data().body,
                        userName: doc.data().userName,
                        createdAt: doc.data().createdAt
                  });
            });
            return response.json(shouts);
      })
      .catch((err) => console.error(err));
});

app.post('/shout', (request, response) => {
      const newShout = {
            body: request.body.body,
            userName: request.body.userName,
            createdAt: new Date().toISOString()
            // createdAt: admin.firestore.Timestamp.fromDate(new Date())
      };

      admin.firestore().collection('shouts')
            .add(newShout)
            .then((doc) => {
                  response.json({ message: `document ${doc.id} created successfully`});
            })
            .catch((err) => {
                  // change status code
                  response.status(500).json({ error: 'something went wrong'});
                  console.error(err);
            });
});


exports.api = functions.https.onRequest(app); // use .api for https://baseurl.com/api/