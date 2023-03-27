const express = require('express');

const transporter = require('../helpers/Mailer');
const router = express.Router();
const { deleteFiles } = require('../helpers/Files');
const path = require('path')
const fs = require("fs")
const { convertBase64 } = require('../helpers/Files');

const { pool } = require('../helpers/Db');

const { uuid } = require('uuidv4');

/**
 * @api {post} /contactUs to send the contact us message
 * @apiName contactUs
 * @apiGroup Util
 *
 * @apiParam {String} req.body Data of the message.
 *
 * @apiSuccess {Boolean} status Status of the API request.
 * @apiSuccess {Object} message Object containing id of the created message submitted.
 *
 * @apiError {Boolean} status Status of the API request.
 * @apiError {String} message Error message.
 *
 */

router.post('/contactUs', async (req, res) => {

    try {

        const mailData = {
            from: req.body.email,
            to: 'surafel@360ground.com',
            subject: `contactus message from ${req.body.firstName} ${req.body.lastName}, phone number : ${req.body.phoneNumber}`,
            text: req.body.message,
        };
    
        transporter.sendMail(mailData, function (err, info) {
            if(err){
                res.status(200).send({ status: false, message: err.message});
    
            } else {
                res.status(200).send({ status: true, 
                    message: 'Thank you for contact us. We will reach you as soon as we can.'});
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


/**
 * @api {post} /createImage Create Image
 * @apiName CreateImage
 * @apiGroup Image
 *
 * @apiParam {String} image Base64 encoded image data.
 * @apiParam {String} filename Name of the image file.
 * @apiParam {String} title Title of the image.
 *
 * @apiSuccess {Boolean} status Indicates whether the operation was successful or not.
 * @apiSuccess {String} message A message describing the result of the operation.

 * @apiError {Boolean} status Indicates whether the operation was successful or not.
 * @apiError {String} message A message describing the error that occurred.
 */

router.post('/createImage', async(req, res) => {
    req.body.id = uuid().replace('-', '');

    let image = req.body.image;
    delete req.body.image;
        
    let result = await convertBase64(image, req.body.id,`images/slide`, true, true, req.body.filename);

    req.body.filename = `${req.body.id}.${req.body.filename}`;

    if(result == undefined){
        try {
    
            pool.get_connection(qb => {
                qb.insert('tbl_images_gallery', req.body, async (err) => {
                    qb.release();
                    if (err) {
                        return res.send({ status: false, message: err.sqlMessage });
    
                    } else {
                        res.send({ status: true, message: 'Uploaded successfully.' });
                    }    
                });
            });
            
        } catch(err){
            res.status(200).send({ status: false, message: err.message });
        }

    } else {
        res.send(result);
    }

});

/**

@api {post} /updateImage Update Image
@apiName UpdateImage
@apiGroup Image
@apiParam {String} id ID of the image to update.
@apiParam {String} [filename] Filename of the image to update.
@apiParam {String} [image] Base64 string of the image to update.
@apiSuccess {Boolean} status Status of the request.
@apiSuccess {String} message Success message.

*/
router.post('/updateImage', async(req, res) => {
    var result = undefined;
    
    if(req.body.image){
        let image = req.body.image;
        
        result = await convertBase64(image, req.body.id,`images/slide`, true, true, req.body.filename);
        req.body.filename = `${req.body.id}.${req.body.filename}`;

        await deleteFiles(req,res, false);
    }
    
    delete req.body.image;
    delete req.body.url;

    if(result == undefined){
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

    } else {
        res.send(result);
    }

});

/**

@api {post} /sortImage Sort Images
@apiName SortImages
@apiGroup Image
@apiParam {String} sortBy Sort order ("asc" or "desc").

*/
router.post('/sortImage', async(req, res) => {
    try {
        pool.get_connection(qb => {
            let select = "*,CONCAT('images/slide/',filename) As url";

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


/**

@api {post} /searchImage Search Images
@apiName SearchImages
@apiGroup Image
@apiParam {String} title Search title of images

*/

router.post('/searchImage', async(req, res) => {
    try {

        pool.get_connection(qb => {
            let select = "*,CONCAT('images/slide/',filename) As url";

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

router.post('/deleteImage', async(req, res) => {
    var ids = [];

    try {

        await req.body.images.forEach(async (element) => {
            let result = await deleteFiles({ body: { url: element.url } },res, false);

            if(result.status){
                ids.push(element.id);
            }

        });

        if(ids.length){
            pool.get_connection(qb => {
                qb.delete('tbl_images_gallery',{ 'id': ids }, (err) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err.message });
                    res.status(200).send({ status: true, message: 'Image deleted successfully.' });
                });
            });

        } else {
            res.status(200).send({ status: false, message: 'Unable to delete Images. try again.' });
        }

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }

});

/**
 * @api {post} /deleteFiles Delete files
 * @apiName DeleteFiles
 * @apiGroup Files
 * 
 * @apiParam {Array} files Array of file names to be deleted.
 */

router.post('/deleteFiles', async(req, res) => {
    let result = await deleteFiles(req, res);
    res.status(200).send(result)
});

/**

@api {get} /getSlidePhotos get Images for front-end
@apiName getSlidePhotoss
@apiGroup Image
@apiParam {String} forFrontpage Search flag of images for frontend

*/
router.get('/getSlidePhotos/:forFrontpage', async(req, res) => {
    try {
        pool.get_connection(qb => {
            let select = "*,CONCAT('images/slide/',filename) As url";

            qb.select(select, false)
            .from('tbl_images_gallery')
            .order_by('updatedAt','desc')

            if(req.params.forFrontpage == 'true'){
                qb.where('showInSlide', 1)
            }

            qb.get((err, response) => {
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