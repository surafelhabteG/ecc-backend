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

                await res.status(200).send(response);
  
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


router.post('/searchCourses', async (req, res) => {

    try {

        pool.get_connection(qb => {
            qb.select('ext.*, category',false)
            .from('tbl_course_extra_info As ext')
            .join('tbl_course_categories As cat', 'ext.categoryId=cat.id')
            .or_like('courseTitle', req.body.courseTitle)

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

router.post('/filterCourses', async (req, res) => {
    var body = req.body;

    try {

        pool.get_connection(qb => {

            var keys = Object.keys(body);
            var values = Object.values(body);

            qb.select('ext.*, category',false)
            .from('tbl_course_extra_info As ext')
            .join('tbl_course_categories As cat', 'ext.categoryId=cat.id')

            keys.forEach((key, index) => {

                if(values[index].length){
                    qb.or_where_in(key, values[index])
                }
    
            });

            qb.get((err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ 
                    status: true, message: response 
                });
            });

        })

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }

});

router.get('/getAllModules/:courseId', async (req, res) => {
    try {

        const cacheResults = await redisClient.get(`modules/${req.params.courseId}`);

        if (cacheResults) {
            res.status(200).send( {
                status: true,
                message: JSON.parse(cacheResults)
            });

        } else {
            canvasAPI.getModules(req.params.courseId, req.query.studentId).then(async (response) => {
                await redisClient.set(`modules/${req.params.courseId}`, JSON.stringify(response), {
                    EX: 30,
                  });
                res.status(200).send({
                    status: true,
                    message: response
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


router.get('/getQuizzes/:courseId', async (req, res) => {
    try {

        canvasAPI.getQuizzes(req.params.courseId).then(async (response) => {
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

router.get('/getQuizSubmission/:courseId/:quizId',(req, res) => {
    try {

        canvasAPI.getQuizSubmissions(req.params.courseId, req.params.quizId).then(async (response) => {
            await res.status(200).send({ status: true, message: response ? response[0].quiz_submissions : [] });

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
            qb.select('ext.*, category',false)
            .from('tbl_course_extra_info As ext')
            .join('tbl_course_categories As cat', 'ext.categoryId=cat.id')
            .where('courseId', req.params.courseId)
            .get((err, response) => {
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
router.get('/getAllCourseExtraInfo/:limit', (req, res) => {

    try {

        pool.get_connection(qb => {
            qb.select('ext.*, category',false)
            .from('tbl_course_extra_info As ext')
            .join('tbl_course_categories As cat', 'ext.categoryId=cat.id')

            if(req.params.limit !== 'all'){
                qb.limit(req.params.limit)
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



// course assessment side effect
router.post('/createAssessmentSideeffect', (req, res) => {
    var body = req.body;

    
    body.forEach(element => {
        element.id = uuid().replace('-', '');
    });

    try {
    
        pool.get_connection(qb => {
            qb.insert_batch('tbl_course_assessment_sideeffect', body, (err) => {
                qb.release();
                if (err) return res.send({ status: false, message: err.sqlMessage });
                res.send({ status: true, message: 'success.' });
            });
        });
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }

});

module.exports = router;