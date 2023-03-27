const express = require('express');
const router = express.Router();
const { uuid } = require('uuidv4');

const { pool } = require('../helpers/Db');

/**
 * @api {post} /category Create a new course category
 * @apiName CreateCourseCategory
 * @apiGroup Course Category
 *
 * @apiSuccess {Object} status `true` if the category was created successfully
 * @apiSuccess {String} message A success message indicating that the category was created
 *
 * @apiError {Object} status `false` if an error occurred while creating the category
 * @apiError {String} message An error message explaining the reason for the failure
 */


router.post('', (req, res) => {
    try {
        req.body.id = uuid().replace('-', '');
            pool.get_connection(qb => {
                qb.insert('tbl_course_categories', req.body, (err) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err.message });
                    res.send({ status: true, message: 'category created successfully.' });
                });
            }); 
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

/**
 * @api {post} /category/update Update an existing course category
 * @apiName UpdateCourseCategory
 * @apiGroup Course Category
 *
 * @apiSuccess {Boolean} status `true` if the category was updated successfully
 * @apiSuccess {String} message A success message indicating that the category was updated
 *
 * @apiError {Boolean} status `false` if an error occurred while updating the category
 * @apiError {String} message An error message explaining the reason for the failure
 */


router.post('/update', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.update('tbl_course_categories', req.body, { id: req.body.id }, (err) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.message });
                res.send({ status: true, message: 'category updated successfully.' });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

/**
 * @api {get} /category Get all course categories
 * @apiName GetAllCourseCategory
 * @apiGroup Course Category
 *
 * @apiSuccess {Boolean} status `true` if the categories were retrieved successfully
 * @apiSuccess {Object[]} message An array of category objects containing their `id` property
 *
 * @apiError {Boolean} status `false` if an error occurred while retrieving the categories
 * @apiError {String} message An error message explaining the reason for the failure
 */


router.get('', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.select(`*, ${false} As isChecked`, false)
            .order_by('category','desc')
            .get('tbl_course_categories', (err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ status: true, message: response });
            });
        });
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

/**
 * @api {delete} /category/:id Delete a course category
 * @apiName DeleteCourseCategory
 * @apiGroup Course Category
 *
 *  @apiParam {Number} id Category ID

 * @apiSuccess {Boolean} status `true` if the category was deleted successfully
 * @apiSuccess {String} message A success message indicating that the category was deleted
 *
 * @apiError {Boolean} status `false` if an error occurred while deleting the category
 * @apiError {String} message An error message explaining the reason for the failure
 */

router.delete('/:id', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.delete('tbl_course_categories',{ id: req.params.id }, (err) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.message });

                res.status(200).send({ status: true, message: 'category deleted successfully.' });
            });
        });
  
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

module.exports = router;