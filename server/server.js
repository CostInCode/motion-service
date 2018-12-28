require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');
const _ = require('lodash');
const morgan = require('morgan');

const {mongoose} = require('./db/mongoose');
const {Motion} = require('./models/motion');

const app = express();
const port = process.env.PORT;

// middleware request json parser
app.use(bodyParser.json());
app.use(morgan('dev'));

app.listen(port, () => {
	console.log(`Magic is on port ${port}...`);
});

// get all user motions
app.get('/motions', (req, res) => {
	Motion.find().then((motions) => {
		res.send(motions);
	}, (e) => {
		res.status(400).send(e);
	});
});


// add new motion 
app.post('/motions', (req, res) => {
	const timestamp = Date.now();
	const date = new Date(timestamp);
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const hour = date.getUTCHours();
	const minutes = date.getUTCMinutes();
	new Motion({
		message: req.body.message,
		year, month, day, hour, minutes
	}).save().then((doc) => {
		doc? res.send(doc) : res.status(400).send("bad request");
	}).catch((e) => res.status(400).send(e));
});

// get number of motions in a specific hour
app.get('/motions/:hour', (req, res) => {
	Motion.find({
		hour: req.params.hour
	}).then((motions) => res.send(`${motions.length}`))
	.catch((e) => res.sendStatus(400));
});


module.exports = {app};
