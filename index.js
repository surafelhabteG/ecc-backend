const app = require('express')();
const express = require('express');
const httpServer = require('http').createServer(app);
const jwt = require('jsonwebtoken');
const router = express.Router();

// Joi validator
const Joi = require('joi')
const validator = require('express-joi-validation').createValidator({passError: false, statusCode: 200})


const querySchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required().email()
})

// default imports
const cors = require('cors');
const bodyParser = require('body-parser')
const path = require('path')
require('dotenv').config();

// variables
const staticPath = path.join(__dirname,'public')
const port = process.env.PORT || 4000;

// middlewares
app.use(express.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: '*' }));
app.use(express.static(staticPath));

app.use(require('./controllers/Account'));
app.use(require('./controllers/Certificate'));
app.use(require('./controllers/Course'));
app.use(require('./controllers/Enrollment'));
app.use(require('./controllers/Payment'));
app.use(require('./controllers/Util'));
app.use(require('./controllers/Reports'));
app.use('/category',require('./controllers/Category'));

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']
  
    if (token == null) return res.sendStatus(401)
  
    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
  
      if (err) return res.sendStatus(403)
  
      req.user = user
  
      next()
    })
}

app.get('/generateToken', (req, res) => {
    let token = jwt.sign({ username: 'surafel' }, process.env.TOKEN_SECRET, { expiresIn: '1800s' });
    res.status(200).send({ status: true, data: token });
});

app.get('/verifayToken', authenticateToken, (req, res) => {
    res.status(200).send('success');
})


app.post('/orders', validator.body(querySchema), (req, res, next) => {
    try {
        // If we're in here then the query was valid!  
        res.end(`Hello ${req.body.name}!`)

    } catch(error){
        res.send({  message: error })
    }
})

httpServer.listen(port, () => console.log(`listening on port ${port}`));