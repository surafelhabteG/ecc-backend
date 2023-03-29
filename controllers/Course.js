const express = require('express');

const canvasAPI = require('node-canvas-api')
const request = require('request');
const router = express.Router();

const { uuid } = require('uuidv4');

const { pool, redisClient } = require('../helpers/Db');

/**

@api {get} /getAllCourses Get all courses
@apiName GetAllCourses
@apiGroup Courses
@apiSuccess {Boolean} status The status of the response. true if successful, false otherwise.
@apiSuccess {Object[]} message The list of all courses.
@apiSuccess {Number} message.id The id of the course.
@apiSuccess {String} message.name The name of the course.
@apiSuccess {String} message.course_code The course code of the course.
@apiError {Boolean} status The status of the response. false if an error occurs.
@apiError {String} message The error message if an error occurs.
*/
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

/**

@api {post} /searchCourses Search courses
@apiName SearchCourses
@apiGroup Courses
@apiParam {String} courseTitle The title of the course to search for.
@apiSuccess {Boolean} status The status of the response. true if successful, false otherwise.
@apiSuccess {Object[]} message The list of all courses matching the search criteria.
@apiSuccess {Number} message.id The id of the course.
@apiSuccess {String} message.name The name of the course.
@apiSuccess {String} message.course_code The course code of the course.
@apiError {Boolean} status The status of the response. false if an error occurs.
@apiError {String} message The error message if an error occurs.
*/
router.post('/searchCourses', async (req, res) => {

    try {

        pool.get_connection(qb => {
            qb.select('ext.*, category',false)
            .from('tbl_course_extra_info As ext')
            .join('tbl_course_categories As cat', 'ext.categoryId=cat.id')
            .or_like('courseTitle', req.body.courseTitle)
            .where('publishStatus', 'published')

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

@api {post} /filterCourses Filter courses
@apiName FilterCourses
@apiGroup Courses
@apiParam {Object} filter An object with properties to filter on.
@apiSuccess {Boolean} status The status of the response. true if successful, false otherwise.
@apiSuccess {Object[]} message The list of all courses matching the filter criteria.
@apiSuccess {Number} message.id The id of the course.
@apiSuccess {String} message.name The name of the course.
@apiSuccess {String} message.course_code The course code of the course.
@apiError {Boolean} status The status of the response. false if an error occurs.
@apiError {String} message The error message if an error occurs.
*/

router.post('/filterCourses', async (req, res) => {
    var body = req.body;

    try {

        pool.get_connection(qb => {

            var keys = Object.keys(body);
            var values = Object.values(body);

            qb.select('ext.*, category',false)
            .from('tbl_course_extra_info As ext')
            .join('tbl_course_categories As cat', 'ext.categoryId=cat.id')
            .where('publishStatus', 'published')

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

/**

@api {get} /getAllModules/:courseId Get all modules for a course
@apiName GetAllModules
@apiGroup Modules
@apiParam {Number} courseId The id of the course to get modules for.
@apiSuccess {Boolean} status The status of the response. true if successful, false otherwise.
@apiSuccess {Object[]} message The list of all modules for the given course.
@apiSuccess {Number} message.id The id of the module.
@apiSuccess {String} message.name The name of the module.
@apiError {Boolean} status The status of the response. false if an error occurs.
@apiError {String} message The error message if an error occurs.
*/
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

/**
 * @api {get} /getQuizzes/:courseId Get Quizzes
 * @apiName GetQuizzes
 * @apiGroup Quizzes
 *
 * @apiParam {Number} courseId Course ID.
 *
 * @apiSuccess {Boolean} status Response status.
 * @apiSuccess {Object[]} message Array of quiz objects.
 *
 * @apiError {Boolean} status Response status.
 * @apiError {String} message Error message.
 */
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


/**
 * @api {get} /getQuizSubmission/:courseId/:quizId Get Quiz Submission
 * @apiName GetQuizSubmission
 * @apiGroup Quizzes
 *
 * @apiParam {Number} courseId Course ID.
 * @apiParam {Number} quizId Quiz ID.
 *
 * @apiSuccess {Boolean} status Response status.
 * @apiSuccess {Object[]} message Array of quiz submission objects.
 *
 * @apiError {Boolean} status Response status.
 * @apiError {String} message Error message.
 */

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

/**
 * @api {get} /getCourseExtraInfo/:courseId Get Course Extra Info
 * @apiName GetCourseExtraInfo
 * @apiGroup Course
 *
 * @apiParam {Number} courseId Course ID.
 *
 * @apiSuccess {Boolean} status Response status.
 * @apiSuccess {Object[]} message Array of course extra info objects.
 *
 * @apiError {Boolean} status Response status.
 * @apiError {String} message Error message.
 */
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

/**
 * @api {get} /getAllCourseExtraInfo/:limit Get all course extra information
 * @apiName GetAllCourseExtraInfo
 * @apiGroup Course
 *
 * @apiParam {String} limit The maximum number of records to return. Use 'all' to retrieve all records.
 *
 * @apiSuccess {Boolean} status Indicates whether the request was successful or not.
 * @apiSuccess {Object} message The response message containing the course extra information.
 * 
 * @apiError {Boolean} status Indicates whether the request was successful or not.
 * @apiError {String} message The error message returned by the server.
 */
router.get('/getAllCourseExtraInfo/:limit/:publishStatus', (req, res) => {

    try {

        pool.get_connection(qb => {
            qb.select('ext.*, category',false)
            .from('tbl_course_extra_info As ext')
            .join('tbl_course_categories As cat', 'ext.categoryId=cat.id')

            if(req.params.limit !== 'all'){
                qb.limit(req.params.limit)
            } 

            if(req.params.publishStatus !== 'all'){
                qb.where('publishStatus', 'published')
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

/**
 * @api {get} /getCourseExtraInfoDetail/:id Get course extra information detail
 * @apiName GetCourseExtraInfoDetail
 * @apiGroup Course
 *
 * @apiParam {Number} id The ID of the course extra information to retrieve.
 *
 * @apiSuccess {Boolean} status Indicates whether the request was successful or not.
 * @apiSuccess {Object} message The response message containing the course extra information detail.
 * 
 * @apiError {Boolean} status Indicates whether the request was successful or not.
 * @apiError {String} message The error message returned by the server.
 */
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

/**

@api {post} /createCourseExtraInfoDetail Create Course Extra Information Detail
@apiName CreateCourseExtraInfoDetail
@apiGroup Course
@apiParam {String} title Title of the course extra information.
@apiParam {String} description Description of the course extra information.
@apiParam {Number} categoryId Category Id of the course extra information.
@apiParam {String} content Content of the course extra information.
@apiParam {String} id Id of the course extra information.
@apiSuccess {Boolean} status Indicates whether the request was successful or not.
@apiSuccess {String} message A message describing the status of the request.
@apiError {Boolean} status Indicates whether the request was successful or not.
@apiError {String} message A message describing the error that occurred during the request.
*/
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

/**

@api {post} /updateCourseExtraInfoDetail Update Course Extra Information
@apiName UpdateCourseExtraInfoDetail
@apiGroup Course
@apiParam {String} id Unique identifier for the course extra information.
@apiParam {String} [title] Title of the course extra information.
@apiParam {String} [description] Description of the course extra information.
@apiParam {String} [category] Category of the course extra information.
@apiSuccess {Boolean} status Status of the request.
@apiSuccess {String} message Message related to the request status.
@apiError {Boolean} status Status of the request.
@apiError {String} message Message related to the request status.
*/
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

/**

@api {delete} /deleteCourseExtraInfoDetail/:id Delete Course Extra Info Detail
@apiName DeleteCourseExtraInfoDetail
@apiGroup Course
@apiParam {String} id The ID of the course extra info detail to delete
@apiSuccess {Boolean} status Indicates if the operation was successful
@apiSuccess {String} message A message indicating the result of the operation
@apiError {Boolean} status Indicates if the operation was successful
@apiError {String} message A message indicating the error that occurred during the operation
*/
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