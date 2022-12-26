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
    // try {
    //     let select = `*,IF(requiredModules=completedModules, DATE_FORMAT(updatedAt, "%M %d %Y"), "Not-Completed") As updatedAt,
    //                 DATEDIFF(updatedAt, createdAt) As totalDaysTaken, DATE_FORMAT(createdAt, "%M %d %Y") createdAt`;

    //     pool.get_connection(qb => {
    //         qb.select(select, false)
    //         .order_by('createdAt','desc')
    //         .where('courseId', req.params.courseId)
    //         .get('tbl_course_enrollment_sideeffect', (err, response) => {
    //             qb.release();
    //             if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
    //             res.status(200).send({ status: true, message: response });
    //         });
    //     });
    
    // } catch(err){
    //     res.status(200).send({ status: false, message: err.message });
    // }


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

        let select = `*,DATE_FORMAT(createdAt, "%M %d %Y") createdAt`;

        var where = "id is not null";

        if(body.dateRange){
    
            if(body.dateRange[0] == body.dateRange[1]){
                where = `createdAt = ${body.dateRange[0]}`;
    
            } else {
                where = `createdAt >= ${body.dateRange[0]} AND createdAt <= ${body.dateRange[1]}`;
            }
        }

        datas = [];

        canvasAPI.getQuizSubmissions(body.courseId, body.quizId).then(async (response) => {
            await res.status(200).send({ status: true, message: response });

            // if(response){

            //     if('quiz_submissions' in response[0]){
                    
            //         var i = 0;
    
            //         await response[0].users.forEach(async (element) => {
            //             canvasAPI.getUserCustomData(element.id).then( async (custom) => {
                            
            //                  datas.push({
            //                     traineeName: element.name,
            //                     traineeSex: custom.data.sex,
            //                     traineeLocation: custom.data.country ? `${custom.data.country} ${custom.data.city}` : '-- not indicated by the user --',
            //                     institution: custom.data.organizationName ?? '-- not indicated by the user --',
            //                     score: response[0].quiz_submissions[i].score,
            //                     moduleName:req.body.moduleName
            //                 });
        
            //                  i++;

            //                 if(response[0].users.length - 1 == datas.length){
            //                     await res.status(200).send({ status: true, message: datas });
            //                 }
            //                 // } else if(response[0].users.length - 1 == datas.length) {
            //                 //     await res.status(200).send({ status: true, message: datas });
                                
            //                 // } else {
            //                 //     await res.status(200).send({ status: true, message: datas });
            //                 // }
                            
            //             }).catch((err) => {
            //                 return { status: false, message: err.message };
            //             });

            //         });


            //     } else {
            //         await res.status(200).send({ status: true, message: datas });
            //     }

            // } else {
            //     await res.status(200).send({ status: true, message: datas });
            // }

        }).catch((err) => {
            res.status(200).send({ status: false, message: err.message });

        });
            
    
        // pool.get_connection(qb => {
        //     qb.select(select, false)
        //     .order_by('traineeName','Asc')
        //     .where('courseId', body.courseId)
        //     .where('quizId', body.quizId)
        //     .where(where)
        //     .get('tbl_course_assessment_sideeffect', (err, response) => {
        //         qb.release();
        //         if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
        //         res.status(200).send({ status: true, message: response });
        //     });
        // });
    
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