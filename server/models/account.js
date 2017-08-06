const mongoose = require('mongoose');

const Account = mongoose.model('Account', {
	name: {
		type: String,
		required: true,
		minLength: 1,
		trim: true
	},
	balance: {
		type: Number,
		default: 0
	},
	_owner: {
		type: mongoose.Schema.Types.ObjectId,
		required: true
	}
});

module.exports = {Account};
