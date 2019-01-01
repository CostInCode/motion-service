require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
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
	Motion.find({
		date: {
			year: req.params.year,
			month: req.params.month,
			day: req.params.day
		}
	}, 'hour', (err, docs) => {
		if(err) return;
		let hours = [];
		docs.forEach(doc => {
			addOrUpdateHours(hours, doc);
		});
		res.send(`hours: ${JSON.stringify(hours)}`);
	}).then(() => console.log('ok')).catch((e) => res.sendStatus(400));
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

