const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true}))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//setup my secret variable (url)
const MONGOURL = process.env.DB_URL;

//connect to database
mongoose.connect(MONGOURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Database connected successfully.");
  })
  .catch(err => {
    console.error("Database connection error:", err);
  });

// Define the schema for the user data using Mongoose
const userSchema = new mongoose.Schema({
  username : String
});

// Create a Mongoose model called "userModel" based on the userSchema
const userModel = mongoose.model("users", userSchema);

// Define the schema for the exercise data using Mongoose
const exerciseSchema = new mongoose.Schema({
  user_id : {type: String, required : true},
  description : String,
  duration : Number,
  date : Date
});

// Create a Mongoose model called "exerciseModel" based on the userSchema
const exerciseModel = mongoose.model("exercise", exerciseSchema);

// create a new user post form
app.post('/api/users' , async (req,res) =>{
  try{
    const newUser = new userModel ({
      username : req.body.username
    })
    const result = await newUser.save()
    res.json({
      username : result.username,
      _id : result._id
    })
  }catch(err){
    res.json({
      Error : err
    })
  }
});

//add exercises post form
app.post('/api/users/:_id/exercises' , async (req , res) => {
  const userid = req.params._id
  const {description , duration , date } = req.body

  try {
    const user = await userModel.findById(userid)
    if (!user){
      return res.json({
        Error : "User Not Found"
      })
    }
    const newExercise = new exerciseModel({
      user_id : user._id,
      description,
      duration,
      date : date ? new Date (date) : new Date() 
    })
    const result = await newExercise.save()

    res.json({
      _id : user._id,
      username : user.username,
      description : result.description,
      duration : result.duration,
      date : new Date (result.date).toDateString()
    })
  }catch(err){
    res.json({
      Error : err
    })
  }
});

//get list of users
app.get('/api/users' , async(req , res) =>{
  const users = await userModel.find({}).select("_id username");
  if (!users){
    res.send("No Users")
  }else{
    res.json(users)
  }
});

//get list of exercise (logs) for specify user id
app.get('/api/users/:_id/logs', async (req, res) =>{
  const {from,to,limit} = req.query
  const userid = req.params._id
  const user = await userModel.findById(userid)
  if (!user){
    res.send("No user")
  }else{
    let dateFilter = {}
    if (from){
      dateFilter["$gte"] = new Date(from)
    }
    if (to){
      dateFilter["$lte"] = new Date(to)
    }
    let filter = {
      user_id : userid
    }

    if (from || to){
      filter.date = dateFilter
    }

    const exercises = await exerciseModel.find(filter).limit(+limit ?? 500)
    const log = exercises.map(e => ({
      description : e.description,
      duration : e.duration,
      date : e.date.toDateString()
    }))
    res.json({
      username : user.username,
      count : exercises.length,
      _id : user._id,
      log
    })
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
