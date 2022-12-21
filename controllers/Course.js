const express = require('express');

const canvasAPI = require('node-canvas-api')
const request = require('request');
const router = express.Router();

const { uuid } = require('uuidv4');

const { pool, redisClient } = require('../helpers/Db');

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
                        EX: 30,
                        // NX: true,
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
            message: err.message
        })
    }
});

router.get('/getAllModules/:courseId', async (req, res) => {
    try {

        const cacheResults = await redisClient.get(`modules/${req.params.courseId}`);

        if (cacheResults) {
            res.status(200).send(JSON.parse(cacheResults));

        } else {
            canvasAPI.getModules(req.params.courseId, req.query.studentId).then(async (response) => {
                await redisClient.set(`modules/${req.params.courseId}`, JSON.stringify(response), {
                    EX: 30,
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
            message: err.message
        })
    }
});


router.get('/getQuizzes/:courseId', async (req, res) => {
    try {

        canvasAPI.getQuizzes(req.params.courseId,include).then((response) => {
            res.status(200).send({ status: true, message: response });
        }).catch((errors) => {
            res.status(200).send({
                status: false,
                message: errors.message
            })
        });
        
    } catch (err) {
        res.status(200).send({
            status: false,
            message: err.message
        })
    }
});

router.get('/getCourseExtraInfo/:courseId', async (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.select('*')
            .where('courseId', req.params.courseId)
            .get('tbl_course_extra_info', (err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ 
                    status: true, message: response 
                });
            });
        });

    } catch (err) {
        res.status(200).send({
            status: false,
            message: err.message
        })
    }
});

// course extra information
router.get('/getCourseExtraInfoDetail/:id', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.select('*')
            .where('courseId', req.params.id)
            .get('tbl_course_extra_info', (err, response) => {
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

router.post('/createCourseExtraInfoDetail', (req, res) => {
    req.body.id = uuid().replace('-', '');

    try {
    
        pool.get_connection(qb => {
            qb.insert('tbl_course_extra_info', req.body, (err) => {
                qb.release();
                if (err) return res.send({ status: false, message: err.sqlMessage });
                res.send({ status: true, message: 'Created successfully.' });
            });
        });
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.post('/updateCourseExtraInfoDetail', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.update('tbl_course_extra_info', req.body, { id: req.body.id }, (err) => {
                qb.release();
                if (err) return res.send({ status: false, message: err.sqlMessage });
                res.send({ status: true, message: 'Updated successfully.' });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.delete('/deleteCourseExtraInfoDetail/:id', async (req,res) => {
    try {
        pool.get_connection(qb => {
            qb.delete('tbl_course_extra_info',{ id: req.params.id }, (err) => {
                qb.release();
                if (err) return res.send({ status: false, message: err.sqlMessage });
                res.send({ status: true, message: 'Deleted successfully.' });
            });
        });
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
})

module.exports = router;