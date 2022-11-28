const express = require('express');

const transporter = require('../helpers/Mailer');
const router = express.Router();
const { deleteFiles } = require('../helpers/Files');

router.post('/contactUs', async (req, res) => {

    try {

        const mailData = {
            from: req.body.email,
            to: 'surafel@360ground.com',
            subject: `contactus message from ${req.body.fullName}, phone number : ${req.body.phoneNumber}`,
            text: req.body.message,
        };
    
        transporter.sendMail(mailData, function (err, info) {
            if(err){
                res.status(200).send({ status: false, message: err.message});
    
            } else {
                res.status(200).send({ status: true, 
                    message: 'Thank you for your contact Us. we will reach you as soon as we can.'});
            }   
        });

    } catch(error){
        res.status(200).send(
            { 
                status: false, message: error.message 
            }
        );
    }
});


// general file delete endpoint
router.post('/deleteFiles', async(req, res) => {
    let result = await deleteFiles(req, res);
    res.status(200).send(result)
});

module.exports = router;