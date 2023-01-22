const express = require('express');

const transporter = require('../helpers/Mailer');
const router = express.Router();
const { deleteFiles } = require('../helpers/Files');
const path = require('path')
const fs = require("fs")
const { convertBase64 } = require('../helpers/Files');

const { pool } = require('../helpers/Db');

const { uuid } = require('uuidv4');


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


router.post('/createImage', async(req, res) => {
    req.body.id = uuid().replace('-', '');

    let image = req.body.image;

    delete req.body.image;

    try {
    
        pool.get_connection(qb => {
            qb.insert('tbl_images_gallery', req.body, async (err) => {
                qb.release();
                if (err) {
                    return res.send({ status: false, message: err.sqlMessage });

                } else {

                    let result = await convertBase64(image, req.body.id,`images/slide`, true, true);

                    if(result.status){
                        res.send({ status: true, message: 'Uploaded successfully.' });

                    } else {
                        res.send(result);

                    }
                }    
            });
        });
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.post('/updateImage', async(req, res) => {
    try {

        pool.get_connection(qb => {
            qb.update('tbl_images_gallery', req.body, { id: req.body.id }, (err) => {
                qb.release();
                if (err) return res.send({ status: false, message: err.sqlMessage });
                res.send({ status: true, message: 'Updated successfully.' });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.post('/sortImage', async(req, res) => {
    try {
        pool.get_connection(qb => {
            let select = "*,CONCAT('images/slide/',id) As url";

            qb.select(select, false)
            .from('tbl_images_gallery')
            .order_by('updatedAt',req.body.sortBy)
            .get((err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ 
                    status: true, message: response 
                });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.post('/searchImage', async(req, res) => {
    try {

        pool.get_connection(qb => {
            let select = "*,CONCAT('images/slide/',id) As url";

            qb.select(select, false)
            .from('tbl_images_gallery')
            .or_like('title', req.body.title)
            .get((err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ 
                    status: true, message: response 
                });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});


router.post('/deleteImage', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.or_where_in('id', req.body.ids)
            qb.delete('tbl_images_gallery', (err) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.message });

                res.status(200).send({ status: true, message: 'Image deleted successfully.' });
            });
        });
  
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

// general file delete endpoint
router.post('/deleteFiles', async(req, res) => {
    let result = await deleteFiles(req, res);
    res.status(200).send(result)
});


router.get('/getSlidePhotos', async(req, res) => {
    try {
        pool.get_connection(qb => {
            let select = "*,CONCAT('images/slide/',id) As url";

            qb.select(select, false)
            .from('tbl_images_gallery')
            .order_by('updatedAt','desc')
            .get((err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ 
                    status: true, message: response 
                });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }

});


module.exports = router;