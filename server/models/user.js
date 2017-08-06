const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const crypto = require('bcryptjs');

const UserSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		minLength: 1,
		trim: true,
		unique: true,
		validate: {
			validator: validator.isEmail,
			message: '{VALUE} is not a valid email'
		}
	},
	password: {
		type: String,
		required: true,
		minLength: 6
	},
	tokens: [{
		access: {
			type: String,
			required: true
		},
		token: {
			type: String,
			required: true
		}
	}]
});

// return me just id and email from object, not all the props like passwords etc...
UserSchema.methods.toJSON = function () {
	const user = this;
	const userObject = user.toObject();

	return _.pick(userObject, ['_id', 'email']);
};

UserSchema.methods.generateAuthToken = function () {
	const user = this;
	const access = 'auth';
	const token = jwt.sign({_id: user._id.toHexString(), access}, process.env.JWT_SECRET).toString();

	user.tokens.push({access, token});

	return user.save().then(() => {
		return token;
	});
};

UserSchema.statics.findByToken = function (token) {
	const User = this;
	let decoded;

	try {
		decoded = jwt.verify(token, process.env.JWT_SECRET);
	} catch (e) {
		return Promise.reject('decoded rejected');
	}

	return User.findOne({
		'_id': decoded._id,
		'tokens.token': token,
		'tokens.access': 'auth'
	});
};

UserSchema.statics.findByCredentials = function (email, password) {
	const User = this;

	return User.findOne({email}).then((user) => {
		if (!user) return Promise.reject();
		return new Promise((resolve, reject) => {
			crypto.compare(password, user.password, (err, res) => {
				if (res) resolve(user);
				else reject(err);
			});
		});
	});
};

UserSchema.pre('save', function (next) {
	const user = this;

	// encrypt the pw only if it gets modified
	if (user.isModified('password')) {
		crypto.genSalt(10, (err, salt) => {
			crypto.hash(user.password, salt, (err, hashedpw) => {
				user.password = hashedpw;
				next();
			});
		});
	} else {
		next();
	}
});

const User = mongoose.model('User', UserSchema);

module.exports = {User};
