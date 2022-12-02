const express = require('express');

// const connection = require('../helpers/Db');
const { convertBase64, deleteFiles } = require('../helpers/Files');

const router = express.Router();
const { uuid } = require('uuidv4');
const canvasAPI = require('node-canvas-api');

const { pool } = require('../helpers/Db');

// Enrollment
router.post('/selfEnroll/:course_id', (req, res) => {
    canvasAPI.createUserCourseEnrollment(req.params.course_id, req.body).then(
        () => res.send({ 
            status: true, 
            message: 'Enrolled successfully.', 
            index: req.body.index !== undefined ? req.body.index : 0 
        })
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message,
            index: req.body.index !== undefined ? req.body.index : 0
        })
    });
});

router.delete('/selfUnEnroll/:course_id/:enrollment_id', (req, res) => {
    canvasAPI.deleteUserCourseEnrollment(req.params.course_id, req.params.enrollment_id).then(
        () => res.send({ status: true, message: 'Course is removed from learning plan.' })
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

router.get('/getAllEnrolledCourses/:userId', (req, res) => {
    canvasAPI.getCoursesByUser(req.params.userId).then(
        response => res.send(response)
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

router.get('/getUserEnrollment/:userId', (req, res) => {
    canvasAPI.getUserEnrollment(req.params.userId).then(
        response => res.send(response)
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message
        })
    });
});

// enrollment request
router.post('/createEnrollmentRequest', (req, res) => {
    try {

        req.body.id = uuid().replace('-', '');
    
        let uploadresult = convertBase64(req.body.traineelist, 'traineelist',`requests/${req.body.id}`, false);
    
        if(uploadresult !== undefined){
            uploadresult = convertBase64(req.body.bankSlip, 'bankSlip', `requests/${req.body.id}`, false);
        }
    
        delete req.body.traineelist;
        delete req.body.bankSlip;

        if(uploadresult !== undefined){
            pool.get_connection(qb => {
                qb.insert('tbl_enrollment_request', req.body, (err) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err.message });
                    res.send({ status: true, message: 'request created successfully.' });
                });
            });
    
        } else {
            res.status(200).send(uploadresult);
        }
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }

});

router.post('/updateEnrollmentRequest', (req, res) => {
    try {

        let uploadresult = { status: true};

        if(req.body.traineelist){
            uploadresult = convertBase64(req.body.traineelist, 'traineelist',`requests/${req.body.id}`, false);
        }

        if(req.body.bankSlip){
            if(uploadresult !== undefined){
                uploadresult = convertBase64(req.body.bankSlip, 'bankSlip', `requests/${req.body.id}`, false);
            }
        }
    
        delete req.body.traineelist;
        delete req.body.bankSlip;

        if(uploadresult !== undefined){
            pool.get_connection(qb => {
                qb.update('tbl_enrollment_request', req.body, { id: req.body.id }, (err) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err.message });
                    res.send({ status: true, message: 'request updated successfully.' });
                });
            });
        }

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.get('/getAllEnrollmentRequest', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.select('*')
            .order_by('updatedAt','desc')
            .get('tbl_enrollment_request', (err, response) => {
                qb.release();
                if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                res.status(200).send({ status: true, message: response });
            });
        });

    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.post('/filterEnrollmentRequest/:institution_id', (req, res) => {
    try {

        var where;

        if(req.body.startDate == req.body.endDate){
            where = `createdAt = ${req.body.startDate}`;

        } else {
            where = `createdAt >= ${req.body.startDate} AND createdAt <= ${req.body.endDate}`;
        }

        if(req.body.institutionId){
            where = `${where} AND institution_id = ${req.body.institutionId}`
        }

        pool.get_connection(qb => {
            qb.select('*')
            .from('tbl_enrollment_request')
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


router.get('/getDetailEnrollmentRequest/:id', (req, res) => {
    try {

        pool.get_connection(qb => {
            qb.select('*')
            .where('id', req.params.id)
                .get('tbl_enrollment_request', (err, response) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err.sqlMessage });
                    res.status(200).send({ status: true, message: response });
                });
        });
    
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.post('/deleteEnrollmentRequest/:id', (req, res) => {
    
    try {

        let result = deleteFiles(req, res, true);
    
        if(result?.status){
            pool.get_connection(qb => {
                qb.delete('tbl_enrollment_request',{ id: req.body.id }, (err) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err.message });
    
                    res.status(200).send({ status: result.status, message: result.status ? 'data deleted successfully.' : result.message });
                });
            });
        }
        
    } catch(err){
        res.status(200).send({ status: false, message: err.message });
    }
});

router.get('/getMyEnrollmentRequest/:institution_id',(req, res) => {
    try {
        pool.get_connection(qb => {
            qb.select('*')
            .order_by('updatedAt','desc')
            .where('institution_id', req.params.institution_id)
            .limit(5)
            .get('tbl_enrollment_request', (err, response) => {
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