const express = require('express');
const router = express.Router();
const { uuid } = require('uuidv4');

const { pool } = require('../helpers/Db');

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

router.get('', (req, res) => {
    try {
        pool.get_connection(qb => {
            qb.select('*')
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