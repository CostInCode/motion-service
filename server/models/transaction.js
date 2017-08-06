const mongoose = require('mongoose');

const Transaction = mongoose.model('Transaction', {
	description: {
		type: String,
		minLength: 1,
		trim: true
	},
	date: {
		type: String,
		required: true,
		minLength: 1,
		trim: true
	},
	category: {
		type: String,
		required: true,
		minLength: 1,
		trim: true
	},
	subcategory: {
		type: String,
		minLength: 1,
		trim: true
	},
	type: {
		type: String,
		required: true,
		minLength: 1,
		trim: true
	},
	amount: {
		type: Number,
		required: true,
		default: 0
	},
	account: {
		type: String,
		required: true,
		minLength: 1,
		trim: true
	},
	_creator: {
		type: mongoose.Schema.Types.ObjectId,
		required: true
	}
});

module.exports = {Transaction};

