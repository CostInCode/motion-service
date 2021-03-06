require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const {mongoose} = require('./db/mongoose');
const {Motion} = require('./models/motion');

const app = express();
const port = process.env.PORT;

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	next();
});
app.use(bodyParser.json());
app.use(morgan('dev'));

app.listen(port, () => {
	console.log(`Server listening on port ${port}...`);
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
	const now = Date.now();
	const datenow = new Date(now);
	const year = datenow.getFullYear();
	const month = datenow.getMonth() + 1;
	const day = datenow.getDate();
	const hour = datenow.getUTCHours();
	const minutes = datenow.getUTCMinutes();
	new Motion({
		message: req.query.message,
		date: {year, month, day}, hour, minutes
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
	const year = parseInt(req.params.year);
	const month = parseInt(req.params.month);
	const day = parseInt(req.params.day);
	Motion.find({
		date: {
			year,
			month,
			day
		}
	}).select('hour').exec().then((docs) => {
		let motionsPerHour = [];
		docs.forEach(doc => addOrUpdateHours(motionsPerHour, doc))
		res.send(`${JSON.stringify(motionsPerHour)}`);
	}).catch((e) => console.log(e));	
});

// given day&hour, get motions per minute
app.get('/motions/:year/:month/:day/:hour', (req, res) => { 
	const year = parseInt(req.params.year);
	const month = parseInt(req.params.month);
	const day = parseInt(req.params.day);
	const hour = parseInt(req.params.hour);
	Motion.find({
		date: {
			year,
			month,
			day
		},
		hour
	}).select('minutes').exec().then((docs) => {
		let motions = [];
		docs.forEach(doc => addOrUpdateMinute(motions, doc))
		res.send(`${JSON.stringify(motions)}`);
	}).catch((e) => console.log(e));
});

// given start date and end date, get nr of motions per day
app.get('/dates', (req, res) => {
	const y1 = req.query.fromYear,
	m1 = req.query.fromMonth,
	d1 = req.query.fromDay,
	y2 = req.query.toYear,
	m2 = req.query.toMonth,
	d2 = req.query.toDay;
	
	let dates = getDates(new Date(y1, m1, d1), new Date(y2, m2, d2));
	let arrayDates = [];
	dates.forEach(date => arrayDates.push({
			year: date.getFullYear(),
			month: date.getMonth()+1,
			day: date.getDate()
	}));
	Motion.find({
		'date': {$in: arrayDates}
	}).select('date').exec().then((docs) => {
		let motionsPerDay = [];
		docs.forEach(doc => addOrUpdateDay(motionsPerDay, doc))
		res.send(`${JSON.stringify(motionsPerDay)}`);
	}).catch((e) => console.log(e)); 	
});

const addOrUpdateDay = (array, item) => {
	const i = array.findIndex(_item => _item.day === item.date.day);
	if(i > -1) {
		let c = array[i].count + 1;
		array[i] = {day: item.date.day, count: c};
	} 
	else array.push({day: item.date.day, count: 1});
}

const addOrUpdateHours = (array, item) => {
	const i = array.findIndex(_item => _item.h === item.hour);
	if(i > -1) {
		let c = array[i].count + 1;
		array[i] = {h: item.hour, count: c};
	} 
	else array.push({h: item.hour, count: 1});
}

const addOrUpdateMinute = (array, item) => {
	debugger;
	const i = array.findIndex(_item => _item.min === item.minutes);
	if(i > -1) {
		let c = array[i].count + 1;
		array[i] = {min: item.minutes, count: c};
	} 
	else array.push({min: item.minutes, count: 1});
}


Date.prototype.addDays = function(days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

const getDates = (startDate, stopDate) => {
    let dateArray = [];
    let currentDate = startDate;
    while (currentDate <= stopDate) {
        dateArray.push(new Date(currentDate));
        currentDate = currentDate.addDays(1);
    }
    return dateArray;
}
	
module.exports = {app};

