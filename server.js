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
        body: 'This is your very first entry that you get to have!',
        lastEdit: new Date(),
        date: new Date(),
        id:'0'
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
      console.log(data);
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
  db.collection(`users/${req.query.uid}/journals/${req.query.id}/entries`).get()
    .then(entriesData => {
      let entries = [];
      entriesData.forEach(doc => {
        entries.push({
          docId: doc.id,
          body: doc.data().body,
          id: doc.data().id,
          title: doc.data().title,
          date: doc.data().date.toDate(),
          lastEdit: doc.data().lastEdit.toDate()
        });
      });
      res.send(JSON.stringify(entries));
      res.end();
    })
    .catch(err => {
      res.send(JSON.stringify([{err: err}]));
      res.end();
    })
});

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
})



app.listen(port, function(){console.log("App listening on port 3000")})