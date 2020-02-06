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
                        createdAt: doc.data().createdAt,
                        likeCount: doc.data().likeCount,
                        commentCount: doc.data().commentCount,
                        userImage: doc.data().userImage
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
            userName: request.user.handle,
            userImage: request.user.imageUrl,
            createdAt: new Date().toISOString(), // createdAt: admin.firestore.Timestamp.fromDate(new Date())
            likeCount: 0,
            commentCount: 0
      };

      db.collection('shouts')
            .add(newShout)
            .then((doc) => {
                  const responseShout = newShout;
                  responseShout.shoutId = doc.id;
                  return response.json({responseShout});
            })
            .catch((err) => {
                  // change status code
                  response.status(500).json({ error: 'something went wrong'});
                  console.error(err);
            });
};

/* Fetch one shout post */
exports.getShout = (request, response) => {
      let shoutData = {};
      db.doc(`/shouts/${request.params.shoutId}`).get()
            .then(doc => {
                  if(!doc.exists) {
                        return response.status(404).json({ error: 'Shout not found'});
                  } 
                  shoutData = doc.data();
                  shoutData.shoutId = doc.id;
                  return db.collection('comments').orderBy('createdAt', 'desc').where('shoutId', '==', request.params.shoutId).get();
            })
            .then(data => {
                  shoutData.comment = [];
                  data.forEach(doc => {
                        shoutData.comment.push(doc.data());
                  });

                  return response.json(shoutData);
            })
            .catch(err => {
                  console.error(err);
                  response.status(500).json({error: err.code});
            });
};

/* Comment on a shout post */
exports.commentOnShout = (request,response) => {
      if(request.body.body.trim() === '') {
            return response.status(400).json({ comment: 'Must not be empty'});
      }
      
      const newComment = {
            body: request.body.body,
            createdAt: new Date().toISOString(),
            shoutId: request.params.shoutId,
            userName: request.user.handle,
            userImage: request.user.imageUrl
      };
      
      db.doc(`/shouts/${request.params.shoutId}`).get()
            .then(doc => {
                  if(!doc.exists) {
                        return response.status(404).json({ error: 'Shout not found'});
                  }
                  return doc.ref.update({commentCount: doc.data().commentCount+ 1});
            })
            .then(() => {
                  return db.collection('comments').add(newComment);
            })
            .then(() => {
                  response.json(newComment); 
            })
            .catch(err => {
                  console.error(err);
                  response.status(500).json({error: 'Something went wrong'});
            });
};

/* Like a shout post */
exports.likeShout = (request, response) => {
      const likeDocument = db.collection('likes')
            .where('userName', '==', request.user.handle)
            .where('shoutId', '==', request.params.shoutId)
            .limit(1);

      const shoutDocument = db.doc(`/shouts/${request.params.shoutId}`);

      let shoutData;

      shoutDocument.get().then(doc => {
            if(doc.exists) {
                  shoutData = doc.data();
                  shoutData.shoutId = doc.id;
                  return likeDocument.get();
            }
            return response.status(404).json({error: 'Shout not foujnd'});
      })
      .then(data => {
            if(data.empty) {
                  return db.collection('likes').add({ 
                        shoutId: request.params.shoutId,
                        userName: request.user.handle
                  })
                  .then(() => {
                        shoutData.likeCount++;
                        return shoutDocument.update({likeCount: shoutData.likeCount});
                  });
            } else {
                  return response.status(400).json({error: 'Shout already liked'});
            }
      })
      .catch(err => {
            console.error(err);
            response.status(500).json({error: err.code});
      });
};

/* unlike a shout post */
exports.unlikeShout = (request, response) => {
      const likeDocument = db.collection('likes').where('userName', '==', request.user.handle).where('shoutId', '==', request.params.shoutId).limit(1);

      const shoutDocument = db.doc(`/shouts/${request.params.shoutId}`);

      let shoutData;

      shoutDocument.get().then(doc => {
            if(doc.exists) {
                  shoutData = doc.data();
                  shoutData.shoutId = doc.id;
                  return likeDocument.get();
            } else {
                  return response.status(404).json({error: 'Shout not found'});
            }
      })
      .then(data => {
            if(data.empty) {
                  return response.status(400).json({error: 'Shout not liked'});
            } else {
                  return db.doc(`/likes/${data.docs[0].id}`).delete()
                  .then(() => {
                        shoutData.likeCount--;
                        return shoutDocument.update({likeCount: shoutData.likeCount});
                  })
                  .then(() => {
                        response.json(shoutData);
                  })
            }
      })
      .catch(err => {
            console.error(err);
            response.status(500).json({error: err.code});
      });
};

/* Delete Shout */
exports.deleteShout = (request, response) => {
      const document = db.doc(`/shouts/${request.params.shoutId}`);
      document
      .get()
      .then(doc => {
            if(!doc.exists) {
                  return response.status(404).json({error: 'Shout not found'});
            }
            // check if this shout belongs to user
            if(doc.data().userName !== request.user.handle) {
                  return response.status(403).json({error: 'Unauthorized'});
            } else {
                  return document.delete();
            }
      })
      .then(() => {
            response.json({message: 'Shout deleted successfully'});
      })
      .catch(err => {
            console.error(err);
            return response.status(500).json({error: err.code});
      });
}