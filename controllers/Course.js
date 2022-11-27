const express = require('express');

const redisClient = require('../helpers/Db')
const canvasAPI = require('node-canvas-api')
const request = require('request');
const router = express.Router();

// Course and other related
router.get('/getAllCourses', async (req, res) => {
    try {

        const cacheResults = await redisClient.get('courses');

        if (cacheResults) {
            res.status(200).send(JSON.parse(cacheResults));

        } else {
            canvasAPI.getAllCoursesInAccount(2).then( async (response) => { 
                if(response.length){
                    await redisClient.set('courses', JSON.stringify(response), {
                        EX: 300,
                        NX: true,
                    });
                }

                res.status(200).send(response);
  
            }).catch((errors) => {
                res.status(200).send({
                    status: false,
                    message: errors.message
                })
            });
        }
    } catch (err) {
        res.status(200).send({
            status: false,
            message: err
        })
    }
});

router.get('/getAllModules/:courseId', async (req, res) => {
    try {

        const cacheResults = await redisClient.get(`modules/${req.params.courseId}`);

        if (cacheResults) {
            res.status(200).send(JSON.parse(cacheResults));

        } else {
            canvasAPI.getModules(req.params.courseId).then(async (response) => {
                await redisClient.set(`modules/${req.params.courseId}`, JSON.stringify(response), {
                    EX: 300,
                    NX: true,
                  });
                res.status(200).send(response);
            }).catch((errors) => {
                res.status(200).send({
                    status: false,
                    message: errors.message
                })
            });
        }
    } catch (err) {
        res.status(200).send({
            status: false,
            message: err
        })
    }
});

router.get('/getCourseExtraInfo/:courseId', async (req, res) => {
    try {

        const cacheResults = await redisClient.get(`courseExtraInfo/${req.params.courseId}`);

        if (cacheResults) {
            res.status(200).send(JSON.parse(cacheResults));

        } else {

            canvasAPI.getCourseFile(req.params.courseId).then((response) => {
                let file = response.find((element) => element.display_name == "extraInfo.json");
        
                request.get(file.url, async function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        await redisClient.set(`courseExtraInfo/${req.params.courseId}`, body, {
                            EX: 300,
                            NX: true,
                          });
                        res.status(200).send(JSON.parse(body));
                    }
                });
        
            }).catch((errors) => {
                res.status(200).send({
                    status: false,
                    message: errors.message
                })
            });
        }

    } catch (err) {
        res.status(200).send({
            status: false,
            message: err.message
        })
    }
});

module.exports = router;