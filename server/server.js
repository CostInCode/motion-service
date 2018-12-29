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


// add new motion // it is a get request because camera cant send post req
app.get('/addMotion', (req, res) => {
	const timestamp = Date.now();
	const date = new Date(timestamp);
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const hour = date.getUTCHours();
	const minutes = date.getUTCMinutes();
	new Motion({
		message: req.query.message,
		year, month, day, hour, minutes
	}).save().then((motion) => {
		motion? res.send(motion) : res.status(400).send("bad request");
	}).catch((e) => res.status(400).send(e));
});

// get number of motions in a specific hour
app.get('/motions/:hour', (req, res) => {
	Motion.find({
		hour: req.params.hour
	}).then((motions) => res.send(`${motions.length}`))
	.catch((e) => res.sendStatus(400));
});

// given a day, get motions per hour 
app.get('/motions/:year/:month/:day', (req, res) => {
	Motion.find({
		year: req.params.year,
		month: req.params.month,
		day: req.params.day
	}, 'hour', (err, docs) => {
		if(err) return;
		let hours = [];
		docs.forEach(doc => {
			addOrUpdateHours(hours, doc);
		});
		res.send(`hours: ${JSON.stringify(hours)}`);
	}).then(() => console.log('ok')).catch((e) => res.sendStatus(400));
});

const addOrUpdateHours = (array, item) => {
	const i = array.findIndex(_item => _item.h === item.hour);
	if(i > -1) {
		let c = array[i].count + 1;
		array[i] = {h: item.hour, count: c};
	} 
	else array.push({h: item.hour, count: 1});
}
	

module.exports = {app};
