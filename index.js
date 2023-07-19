const express = require('express')
const app = express()
const cors = require('cors')
const bodyparser = require('body-parser');
require('dotenv').config()

const mongoose = require('mongoose');
const { request } = require('express');
mongoose.connect(process.env.MONGODB, {useNewUrlParser: true, useUnifiedTopology: true});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

const exerciseSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: true
  },
  description: {
    type: String, 
    required: true
  }, 
  duration: {
    type: Number, 
    required: true
  }, 
  date: {
    type: Date,
    required: true
  }
})

let User = mongoose.model('users', userSchema);
let Exercise = mongoose.model('exercises', exerciseSchema);

const addToDb = async (model) => {
  try {
    return await model.save();
  } catch (err) {
    throw err;
  }
};

const findUserById = async (id) => {
  try {
    return await User.findById(id);
  } catch (err) {
    throw err; 
  }
};

const getAllUsers = async () => {
  try {
    return await User.find({});
  } catch (err) {
    throw err;
  }
};

const getUserLog = async (userid, from = new Date(0), to = new Date()) => {
  try {
    return await Exercise.find({ 
      userid: userid,
      date: { $gte: from, $lte: to}
    }, 'description duration date -_id').exec();
  } catch (err) {
    throw err; 
  }
};

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post('/api/users', bodyparser.urlencoded({ extended: true}), async (req, res) => {
  // create new user id (it does not matter if the name is already used, _id is used for linking exercises to user)
  try {
    const newUser = await addToDb(new User({
      username: req.body.username
    }));
    res.json({
      username: newUser.username,
      _id: newUser._id
    });
  } catch (err) {
    res.status(500).json({ error: err});
  }
});

app.post('/api/users/:_id/exercises', bodyparser.urlencoded({ extended: true}), async (req, res) => {
  // add exercise for user
  try {
    // check if user exists 
    const existingUser = await findUserById(req.params._id); 
    if (existingUser) {
      const newExercise = await addToDb(new Exercise({
        userid: req.params._id,
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date ? req.body.date : new Date()
      }));
      res.json({
        username: existingUser.username,
        description: newExercise.description,
        duration: newExercise.duration,
        date: newExercise.date.toDateString(),
        _id: newExercise.userid
      })
    } else {
      res.json( {error: 'User not found'});
    }
    
  } catch (err) {
    res.status(500).json({ error: err});
  }
});


app.get('/api/users/:_id/logs', async (req, res) => {
  // return exercise log for the provided user id
  try {
    const existingUser = await findUserById(req.params._id); 
    if (existingUser) {
      let exercises = await getUserLog(req.params._id, req.query.from, req.query.to);
      exercises = exercises.map(x => {
        return {
          description: x.description,
          duration: x.duration,
          date: x.date.toDateString()
        }
      }); 
      if (req.query.limit && req.query.limit < exercises.length) {
        // only return first x (limit) entries:
        exercises = exercises.slice(0, req.query.limit);
      }
      res.json({
        username: existingUser.username,
        count: exercises.length,
        _id: req.params._id,
        log: exercises
      });
    } else {
      res.json( {error: 'User not found'});
    }
  } catch (err) {
    res.status(500).json({ error: err});
  }
});

app.get('/api/users/', async (req, res) => {
  // return list of all users 
  try {
    res.json( await getAllUsers());
  } catch (err) {
    res.status(500).json({ error: err});
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
