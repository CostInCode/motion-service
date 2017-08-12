require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');
const _ = require('lodash');
const morgan = require('morgan');

const {mongoose} = require('./db/mongoose');
const {Transaction} = require('./models/transaction');
const {User} = require('./models/user');
const {Account} = require('./models/account');
const authenticate = require('./middleware/authenticate');

const app = express();
const port = process.env.PORT;

// middleware request json parser
app.use(bodyParser.json());
app.use(morgan('dev'));

app.listen(port, () => {
	console.log(`Magic is on port ${port}...`);
});

// get all user transactions
app.get('/transactions', authenticate, (req, res) => {
	Transaction.find({
		_creator: req.user._id
	}).then((transactions) => {
		res.send(transactions);
	}, (e) => {
		res.status(400).send(e);
	});
});

// get recent transactions
app.get('/transactions/last', authenticate, (req, res) => {
	Transaction.find().sort({_id: -1}).limit(5).select('type category subcategory date amount')
		.then((transactions) => res.send(transactions), 
			(e) => res.status(400).send(e));
});

// get graph stats transactions
app.get('/transactions/graph', authenticate, (req, res) => {
	Transaction.find().select('type category amount')
		.then((transactions) => res.send(transactions), 
			(e) => res.status(400).send(e));
});

app.get('/transactions/graph/:type', authenticate, (req, res) => {
	Transaction.find({type: req.params.type}).select('category amount')
		.then((transactions) => {
			let categories = [];
			transactions.forEach(
				(transaction) => {
					let duplicate = categories.find((doc) => doc.category === transaction.category);
					if (duplicate) duplicate.amount += transaction.amount;
					else categories.push({
					category: transaction.category,
					amount: transaction.amount
				});
				
			});
			res.send(categories);
		}, 
		(e) => res.status(400).send(e));
});

app.get('/transactions/:id', authenticate, (req, res) => {
	const id = req.params.id;
	if (!ObjectID.isValid(id)) {
		console.log('Not a valid id');
		return res.status(400).send();
	}
	Transaction.findOne({
		_id: id,
		_creator: req.user._id
	}).then((transaction) => {
		!transaction ? res.status(404).send() : res.send({transaction});
	}).catch((e) => res.status(400).send());
});

// add new transaction
app.post('/transactions', authenticate, (req, res) => {
	new Transaction({
		description: req.body.description,
		date: req.body.date,
		category: req.body.category,
		subcategory: req.body.subcategory,
		type: req.body.type,
		amount: req.body.amount,
		account: req.body.account,
		_creator: req.user._id
	}).save().then((doc) => {
		res.send(doc);
		// UPDATE ACCOUNT WITH TRANS.AMOUNT
	}, (e) => {
		res.status(400).send(e);
	});
});

// SIGN UP 
app.post('/users/register', (req, res) => {
	const body = _.pick(req.body, ['email', 'password']);
	const newUser = new User(body);
	newUser.save().then(() => {
		return newUser.generateAuthToken();
	}).then((token) => {
		res.header('x-auth', token).send(newUser);
		
		// create accounts for the new user
		new Account({name: "Cash", _owner: newUser._id}).save();
		new Account({name: "Bank", _owner: newUser._id}).save();
		new Account({name: "Card", _owner: newUser._id}).save();
	}).catch((e) => {
		res.status(400).send(e);
	});
});

// LOGIN
app.post('/users/login', (req, res) => {
	const body = _.pick(req.body, ['email', 'password']);
	User.findByCredentials(body.email, body.password).then((user) => {
		return user.generateAuthToken().then((token) => {
			res.header('x-auth', token).status(200).send();
		});
	}).catch((e) => {
		res.status(400).send(e);
	});
});

// letme in
app.get('/users/me', authenticate, (req, res) => {
	res.send("hello my client");
});

// get accounts name and balance
app.get('/accounts', authenticate, (req, res) => {
	Account.find({
		_owner: req.user._id
	}).then((accounts) => {
		let response = [];
		accounts.forEach((account) => {
			response.push({
				"name": "Type: " + account.name,
				"balance": "Balance: " + account.balance
			});
		});
		res.send(response);
	}, (e) => {
		res.status(400).send(e);
	});
});

// get account balance
app.get('/accounts/:name/balance', authenticate, (req, res) => {
	Account.findOne({
		name: req.params.name,
		_owner: req.user._id
	}).then((result) => res.send(JSON.stringify(result.balance)),
		(e) => {
		res.status(400).send(e);
	});
});

// update amount account
app.patch('/accounts/update/:name', authenticate, (req, res) => {
	Account.findOneAndUpdate({
		name: req.params.name,
		_owner: req.user._id
	}, {$set: {balance: req.body.balance}}, {new : true}).then((doc) => {
		!doc? res.status(400).send("bad request") : res.send(doc);
	}).catch((e) => res.status(400).send(e));
});

module.exports = {app};
