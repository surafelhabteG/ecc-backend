const express = require('express');

const send = require('../helpers/Mailer');
const router = express.Router();
const deleteFiles = require('../helpers/Files');

router.post('/contactUs', async (req, res) => {
    let subject = `contactus message from ${req.body.fullName}, phone number : ${req.body.phoneNumber}`;
    let result = await send('surafel@360ground.com',subject,req.body.message);
   
    res.status(200).send(result);
});


// general file delete endpoint
router.post('/deleteFiles', async(req, res) => {
    let result = await deleteFiles(req, res);
    res.status(200).send(result)
});

module.exports = router;