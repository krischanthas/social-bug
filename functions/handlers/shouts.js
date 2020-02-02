const { db } = require('../util/admin');

exports.getAllShouts = (request, response) => {
      db.collection('shouts')
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
};

exports.postOneShout = (request, response) => {
      if(request.body.body.trim() === '') {
            return response.status(400).json({body: 'Body must not be empty'});
      }
      const newShout = {
            body: request.body.body,
            userName: request.body.userName,
            createdAt: new Date().toISOString()
            // createdAt: admin.firestore.Timestamp.fromDate(new Date())
      };

      db.collection('shouts')
            .add(newShout)
            .then((doc) => {
                  return response.json({ message: `document ${doc.id} created successfully`});
            })
            .catch((err) => {
                  // change status code
                  response.status(500).json({ error: 'something went wrong'});
                  console.error(err);
            });
};