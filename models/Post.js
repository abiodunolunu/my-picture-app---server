const { Schema, Types, model } = require('mongoose')

const postSchema = new Schema({
    owner: {
        type: Types.ObjectId,
        ref: 'User'
    },
    imageUrl: {
        type: String,
        required: true
    },
    imagePublicId: {
        type: String,
        required: true
    },
    caption: {
        type: String,
    },
    likes: [{
        type: Types.ObjectId,
        ref: 'User'
    }]
}, {timestamps: true})

module.exports = model('Post', postSchema)
