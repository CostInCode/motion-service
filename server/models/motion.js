const mongoose = require('mongoose');

const Motion = new mongoose.model('Motion', {
	message: {
		type: String
	},
	date: {
		year: {
			type: Number
		},
		month: {
			type: Number
		},
		day: {
			type: Number
		}
	},
	hour: {
		type: String
	},
	minutes: {
		type: String
	}
})



module.exports = {Motion};

