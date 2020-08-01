const { Schema, Types, model } = require("mongoose");

const userSchema = new Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    username: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    resetToken: String,
    resetTokenExpiration: Date,
    friends: [{
        type: Types.ObjectId,
        ref: 'User'
    }],
    friendRequests: [{
        type: Types.ObjectId,
        ref: 'User'
    }]
})

module.exports = model('User', userSchema);