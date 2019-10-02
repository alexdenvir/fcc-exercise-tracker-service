const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI)

let Schema = mongoose.Schema;

let UserSchema = new Schema(
  {
    username: String,
    logs: [{
      description: String,
      duration: Number,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  }
)

let User = mongoose.model('User', UserSchema)

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post(
  '/api/exercise/new-user',
  (req, res) => {
    let newUser = new User(
      {
        username: req.body.username
      }
    )
    
    newUser.save()
    
    res.json({userId: newUser.id, username: newUser.username})
  }
)

app.get(
  '/api/exercise/users',
  (req, res) => {
    User.find({}).exec(
      (err, data) => {
        let users = data.map(user => {
          return {
            userId: user.id,
            username: user.username
          }
        })
        
        res.json(users)
      }
    )
  }
)

app.post(
  '/api/exercise/add',
  (req, res) => {
    User.findById(req.body.userId, (err, data) => {
      let newLog = {
          description: req.body.description,
          duration: req.body.duration,
          date: req.body.date ? new Date(req.body.date) : new Date()
        }
      
      data.logs.push(newLog)
      
      data.save()
      
      res.json(
        {
          username: data.username,
          description: newLog.description,
          duration: newLog.duration,
          date: newLog.date
        }
      )
    })
  }
)

app.get(
  '/api/exercise/log',
  (req, res) => {
    User.findById(req.query.userId, (err, data) => {
      if (err) {
        res.json({error: err})
        return
      }
      
      let logs = data.logs
      
      if (req.query.from) {
        let fromDate = new Date(req.query.from)
        
        logs = logs.filter(log => {
          let logDate = new Date(log.date)
          
          return logDate >= fromDate
        })
      }
      
      if (req.query.to) {
        let toDate = new Date(req.query.to)
        
        logs = logs.filter(log => {
          let logDate = new Date(log.date)
          
          return logDate < toDate
        })
      }
      
      logs.sort((first, second) => {
        let firstDate = new Date(first.date)
        let secondDate = new Date(second.date)
        
        return (firstDate > secondDate) - (firstDate < secondDate)
      })
      
      if (req.query.limit) {
        logs = logs.slice(0, req.query.limit)
      }
      
      res.json(
        {
          username: data.username,
          count: logs.length,
          log: logs
        }
      )
    })
  }
)

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
