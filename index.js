const app = require('express')();
const express = require('express');
const httpServer = require('http').createServer(app);

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

app.get('/', (req, res) => {
    res.status(200).send('welcome to Ecc Express Api App');
});

httpServer.listen(port, () => console.log(`listening on port ${port}`));