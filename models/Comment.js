const { Types, Schema, model } = require('mongoose')

const commentSchema = new Schema({
    post: {
        type: Types.ObjectId,
        ref: 'Post'
    },
    text: String,
    author: {
        type: Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true })

module.exports = model('Comment', commentSchema);