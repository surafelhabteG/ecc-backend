const express = require('express');
const router = express.Router();

const { pool } = require('../helpers/Db');
const canvasAPI = require('node-canvas-api');

router.get('/getAllFinancialReports',(req, res) => {
    try {
        pool.get_connection(qb => {
            qb.select(`*,DATE_FORMAT(createdAt, "%M %d %Y") createdAt`, false)
            .order_by('updatedAt','desc')
            // .limit(50)
            .get('tbl_payment_sideeffect', (err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ status: true, message: response });
            });
        });
    
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.post('/filterFinancialReports', (req, res) => {
    try {

        var where;

        if(req.body.startDate == req.body.endDate){
            where = `createdAt = ${req.body.startDate}`;

        } else {
            where = `createdAt >= ${req.body.startDate} AND createdAt <= ${req.body.endDate}`;
        }

        pool.get_connection(qb => {
            qb.select(`*,DATE_FORMAT(createdAt, "%M %d %Y") createdAt`, false)
            .from('tbl_payment_sideeffect')
            .where(where)
            .order_by('updatedAt','desc')
            .get((err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ status: true, message: response });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});


router.get('/getAllTraineePerformanceReports/:courseId',(req, res) => {
    try {
    
        canvasAPI.getCoursesBulkProgress(req.params.courseId).then( async (response) => { 
            await res.status(200).send({
                status: true,
                message: response
            });

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


router.post('/getAllTraineeListReports',(req, res) => {
    let body = req.body;
    
    try {

        canvasAPI.getQuizSubmissions(body.courseId, body.quizId).then(async (response) => {
            await res.status(200).send({ status: true, message: response });

        }).catch((err) => {
            res.status(200).send({ status: false, message: err.message });

        });
    
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.get('/getAllTraineeAverageReports/:courseId',(req, res) => {
    try {
        
        let select = `courseTitle,courseId,AVG(progress) As averageProgress, 
                      AVG(DATEDIFF(updatedAt, createdAt)) As averageCompletionTime
                      `;

        pool.get_connection(qb => {
            qb.select(select, false)
            .where('courseId', req.params.courseId)
            .group_by('courseId')
            .group_by('courseTitle')
            .get('tbl_course_enrollment_sideeffect', (err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ status: true, message: response });
            });
        });
    
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

module.exports = router;