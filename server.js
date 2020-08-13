var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
// Load the SDK and UUID
var AWS = require('aws-sdk');
const admin = require('firebase-admin');
const serviceAccount = require('./myjournal-7f5cc-firebase-adminsdk-i8cgd-f9d46cc32d.json');
require('dotenv').config();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

let port = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://myjournal-7f5cc.firebaseio.com"
});

const db = admin.firestore();


app.post('/registerUser', (req, res) => {
  admin.auth().createUser({
    email: req.body.email,
    password: req.body.password
  })
  .then((data) => {
    let journal = db.collection(`users/${data.uid}/journals`).add({
      title: 'Example Journal',
      img: 'selective-focus-photography-of-person-touch-the-white-704813.jpg',
      id: '0',
      lastEntryId: '0'
    })
    .then(secondRes => {
      db.collection(`users/${data.uid}/userInfo`).add({
        lastJournalId: '0',
        tags: []
      });
      db.collection(`users/${data.uid}/journals/${secondRes.id}/entries`).add({
        title: 'Your First Entry',
        body: 'This is your very first entry!',
        lastEdit: new Date(),
        date: new Date(),
        selectedTags: []
      }).then(thirdRes => {
        let myjson = JSON.stringify({res: 'success', user: data.uid});
        res.send(myjson);
        res.end();
      }).catch(err => {
        res.send(JSON.stringify({res: err}));
        res.end();
      })
    })
    .catch(err => {
      res.send(JSON.stringify({res: err}));
      res.end();
    })
  })
  .catch(err => {
    res.send(JSON.stringify({res: err}));
    res.end();
  });
});

app.get('/allJournals', (req, res) => {
  db.collection(`users/${req.query.uid}/journals`).get()
  .then(data => {
    let giveBack = [];
    data.forEach(doc => {
      giveBack.push({
        docId: doc.id,
        ...doc.data()
      });
    });
    res.send(JSON.stringify(giveBack));
    res.end();
  }).catch(err => {
    res.send(JSON.stringify([{err:err}]));
    res.end();
  })
  
});

app.get('/journalById', (req,res) => {
  db.collection(`users/${req.query.uid}/journals`).doc(req.query.id).get()
    .then(data => {
      let giveBack = {
        docId: data.id,
        ...data.data()
      };
      res.send(JSON.stringify(giveBack));
      res.end();
    })
    .catch(err => {
      console.log(err);
      res.send(JSON.stringify({err:err}));
      res.end();
    });
});

app.get('/entriesById', (req, res) => {
  db.collection(`users/${req.query.uid}/journals/${req.query.id}/entries`).orderBy('lastEdit', 'desc').limit(15).get()
    .then(entriesData => {
      let entries = [];
      entriesData.forEach(doc => {
        entries.push({
          docId: doc.id,
          body: doc.data().body,
          id: doc.data().id,
          title: doc.data().title,
          date: doc.data().date.toDate(),
          lastEdit: doc.data().lastEdit.toDate(),
          selectedTags: doc.data().selectedTags
        });
      });
      res.send(JSON.stringify(entries));
      res.end();
    })
    .catch(err => {
      console.log(err);
      res.send(JSON.stringify([{err: err}]));
      res.end();
    })
});

app.get('/entriesFromLastId', (req, res) => {
  db.collection(`users/${req.query.uid}/journals/${req.query.id}/entries`).doc(req.query.entryId).get()
    .then(snapshot => {
      db.collection(`users/${req.query.uid}/journals/${req.query.id}/entries`).orderBy('lastEdit', 'desc').startAfter(snapshot).limit(15).get()
        .then(entriesData => {
          let entries = [];
          entriesData.forEach(doc => {
            entries.push({
              docId: doc.id,
              body: doc.data().body,
              id: doc.data().id,
              title: doc.data().title,
              date: doc.data().date.toDate(),
              lastEdit: doc.data().lastEdit.toDate(),
              selectedTags: doc.data().selectedTags
            });
          });
          res.send(JSON.stringify(entries));
          res.end();
        })
        .catch(err => {
          console.log(err);
          res.send(JSON.stringify([{err: err}]));
          res.end();
        })
    })
    .catch(err => {
      console.log(err);
      res.send(JSON.stringify([{err: err}]));
      res.end();
    })
})

app.get('/tags', (req, res) => {
  db.collection(`users/${req.query.uid}/userInfo`).get()
    .then(userInfo => {
      let tags;
      userInfo.forEach(doc => {
        tags = doc.data().tags;
      });
      res.send(JSON.stringify(tags));
      res.end();
    })
    .catch(err => {
      res.send(JSON.stringify([{err: err}]));
      res.end();
    });
});

app.get('/entryById', (req, res) => {
  db.collection(`users/${req.query.uid}/journals/${req.query.journalId}/entries`).doc(req.query.entryId).get()
    .then(doc => {
      let giveBack = {
        docId: doc.id,
        body: doc.data().body,
        id: doc.data().id,
        title: doc.data().title,
        date: doc.data().date.toDate(),
        lastEdit: doc.data().lastEdit.toDate(),
        selectedTags: doc.data().selectedTags
      };
      res.send(JSON.stringify(giveBack));
      res.end();
    })
    .catch(err => {
      res.send(JSON.stringify({err: err}));
      res.end();
    }); 
});

app.get('/journalTitle', (req, res) => {
  db.collection(`users/${req.query.uid}/journals`).doc(req.query.id).get()
    .then(journal => {
      res.send(JSON.stringify({title: journal.data().title}));
      res.end();
    })
    .catch(err => {
      res.send(JSON.stringify({err: err}));
    });
});

app.post('/updateTags', (req,res) => {
  db.collection(`users/${req.body.uid}/userInfo`).get()
    .then(collection => {
      let docId;
      collection.forEach(doc => {
        docId = doc.id;
      });
      db.collection(`users/${req.body.uid}/userInfo`).doc(docId).update({tags: req.body.tag});
    })
  res.end();
});

app.post('/updateJournal', (req,res) => {
  db.collection(`users/${req.body.uid}/journals`).doc(req.body.journal.docId).update(req.body.journal);
  res.end();
});

app.post('/createNewJournal', (req, res) => {
  db.collection(`users/${req.body.uid}/journals`).add(req.body.journal)
    .then(data => {
      res.send(JSON.stringify({journalId: data.id}));
      res.end();
    })
    .catch(err => {
      res.send(JSON.stringify({err: err}));
      res.end();
    })
});

app.delete('/deleteJournal', (req, res) => {
  async function deleteCollection(db, collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);
  
    return new Promise((resolve, reject) => {
      deleteQueryBatch(db, query, resolve).catch(reject);
    });
  }
  
  async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();
  
    const batchSize = snapshot.size;
    if (batchSize === 0) {
      // When there are no documents left, we are done
      resolve();
      return;
    }
  
    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  
    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
      deleteQueryBatch(db, query, resolve);
    });
  }

  deleteCollection(db, `users/${req.query.uid}/journals/${req.query.journalId}/entries`, 10).then(() => {
    db.collection(`users/${req.query.uid}/journals`).doc(req.query.journalId).delete().then(secondRes => {
      res.end();
    })
    .catch(err => {
      console.log(err);
      res.end();
    })
  });
});

app.post('/createEntry', (req, res) => {
  db.collection(`users/${req.body.uid}/journals/${req.body.journalId}/entries`).add({
    title: req.body.entryTitle,
    date: new Date(),
    body: 'This is the start to your entry!',
    selectedTags: [],
    lastEdit: new Date()
  }).then(data => {
    res.send(JSON.stringify({id: data.id}));
    res.end();
  }).catch(err => {
    console.log(err);
    res.send(JSON.stringify({err: err}));
    res.end();
  });
});

app.post('/updateEntry', (req, res) => {
  db.collection(`users/${req.body.uid}/journals/${req.body.journalId}/entries`).doc(req.body.entryId).update({
    title: req.body.editedEntry.title,
    date: new Date(req.body.editedEntry.date),
    body: req.body.editedEntry.body,
    selectedTags: req.body.editedEntry.selectedTags,
    lastEdit: new Date()
  })
    .then(data => {
      db.collection(`users/${req.body.uid}/journals/${req.body.journalId}/entries`).doc(req.body.entryId).get()
        .then(doc => {
          res.send(JSON.stringify({
            docId: doc.id,
            body: doc.data().body,
            id: doc.data().id,
            title: doc.data().title,
            date: doc.data().date.toDate(),
            lastEdit: doc.data().lastEdit.toDate(),
            selectedTags: doc.data().selectedTags
          }));
          res.end();
        }).catch(err => {
          console.log(err);
          res.send(JSON.stringify({err: err}));
          res.end();
        });
    }).catch(err => {
      console.log(err);
      res.send(JSON.stringify({err: err}));
      res.end();
    })
});

app.post('/updateSelectedTags', (req, res) => {
  db.collection(`users/${req.body.uid}/journals/${req.body.journalId}/entries`).doc(req.body.entryId).update({selectedTags: req.body.selectedTags}).then(data => {
    res.end();
  }).catch(err => {
    console.log(err);
    res.send(JSON.stringify({err: err}));
    res.end();
  });
});



app.listen(port, function(){console.log("App listening on port 3000")})