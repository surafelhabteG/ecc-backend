const express = require('express');

// const connection = require('../helpers/Db');
const convertBase64 = require('../helpers/Files');
const deleteFiles = require('../helpers/Files');

const router = express.Router();
const { uuid } = require('uuidv4');

const canvasAPI = require('node-canvas-api');

const QueryBuilder = require('node-querybuilder');

const connection = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecc'
};

const pool = new QueryBuilder(connection, 'mysql', 'pool');

// Enrollment
router.post('/selfEnroll/:course_id/:index', (req, res) => {
    canvasAPI.createUserCourseEnrollment(req.params.course_id, req.body).then(
        () => res.send({ 
            status: true, 
            message: 'Enrolled successfully.', 
            index: req.params.index !== undefined ? req.params.index : 0 
        })
    ).catch((errors) => {
        res.status(200).send({
            status: false,
            message: errors.message,
            index: req.params.index !== undefined ? req.params.index : 0
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
router.post('/createEnrollmentRequest', async (req, res) => {
    try {

        req.body.id = uuid().replace('-', '');
    
        let uploadresult = await convertBase64(req.body.traineelist, 'traineelist',`requests/${req.body.id}`, false);
    
        if(uploadresult !== undefined){
            uploadresult = await convertBase64(req.body.bankSlip, 'bankSlip', `requests/${req.body.id}`, false);
        }
    
        delete req.body.traineelist;
        delete req.body.bankSlip;

        if(uploadresult !== undefined){
            pool.get_connection(qb => {
                qb.insert('tbl_enrollment_request', req.body, (err) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err });
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

router.post('/updateEnrollmentRequest', async (req, res) => {
    try {

        let uploadresult = { status: true};

        if(req.body.traineelist){
            uploadresult = await convertBase64(req.body.traineelist, 'traineelist',`requests/${req.body.id}`, false);
        }

        if(req.body.bankSlip){
            if(uploadresult !== undefined){
                uploadresult = await convertBase64(req.body.bankSlip, 'bankSlip', `requests/${req.body.id}`, false);
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

        let SD = new Date(req.body.startDate + 'UTC');
        let startDate = `${SD.getFullYear()}-${SD.getMonth()}-${SD.getDate()}`;

        ED = new Date(req.body.endDate + 'UTC');
        let endDate = `${ED.getFullYear()}-${ED.getMonth()}-${ED.getDate()}`;

        pool.get_connection(qb => {
            qb.select('*')
            .where('institution_id', req.params.institution_id)
            .where('Date(createdAt)', `>= '${startDate}`)
            .where('Date(createdAt)', `<= '${endDate}`)

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

router.post('/deleteEnrollmentRequest/:id', async (req, res) => {
    
    try {

        let result = await deleteFiles(req, res, true);
    
        if(result?.status){
            pool.get_connection(qb => {
                qb.delete('tbl_enrollment_request',{ id: req.body.id }, (err) => {
                    qb.release();
                    if (err) return res.status(200).send({ status: false, message: err });
    
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