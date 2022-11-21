const express = require('express');
const app = express();
const Redis = require('redis');
app.use(express.json());
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;

// mongodb uri
const mongoURI = 'mongodb://localhost:27017';
// redis uri
const redisURI = 'http://localhost:6379';

// create mongo client
const mongoClient = new MongoClient(mongoURI);
// create redis client
const redisClient = Redis.createClient(redisURI);

async function connection() {
  try {
    await mongoClient.connect();
    await redisClient.connect();

    const mongoDb = mongoClient.db('redis');
    const usersCollection = mongoDb.collection('users');

    // user post route
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // get all users
    app.get('/users', async (req, res) => {
      const users = await cashSetAndGet('users', async () => {
        const result = await usersCollection.find({}).toArray();
        return result;
      });
      res.send(users);
    });

    // get a single user
    app.get('/users/:id', async (req, res) => {
      const id = req.params.id;
      const user = await cashSetAndGet(`user:${id}`, async () => {
        const user = await usersCollection.findOne({
          _id: ObjectId(id),
        });
        return user;
      });
      res.send(user);
    });

    // catch block
  } catch (error) {
    console.log(error);
  }
}
// database invoking
connection().catch(console.dir);

// cash data set and get function
async function cashSetAndGet(key, callback) {
  const data = await redisClient.get(key);
  if (data) {
    return JSON.parse(data);
  } else {
    const data = await callback();
    redisClient.setEx(key, 3600, JSON.stringify(data));
    return data;
  }
}

// default route
app.get('/', (req, res) => {
  res.send('Hello World!');
});
// server listening
app.listen(3000, () => console.log('Server listening on port 3000'));
