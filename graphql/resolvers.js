const { default: validator } = require("validator");
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const dotenv = require('dotenv')
dotenv.config({ path: './config/config.env' })
const Post = require("../models/Post");
const Comment = require('../models/Comment');
const { uploader } = require("../middleware/cloudinaryUpload");
const jwtSecret = process.env.jwtSecret;

module.exports = {
    createUser: async ({ userInput }, req) => {
        const { firstname, lastname, email, password, confirmPassword } = userInput;
        const errors = [];
        if (!validator.isEmail(email)) {
            errors.push({ message: 'E-mail is invalid' })
        }
        if (!validator.isLength(firstname, { min: 1 }) || !validator.isLength(lastname, { min: 1 })) {
            errors.push({ message: "Both name fields are required" })
        }
        if (validator.isEmpty(password) || !validator.isLength(password, { min: 5 })) {
            errors.push({ message: 'Password is too short' })
        }
        if (!validator.equals(password, confirmPassword)) {
            errors.push({ message: 'Both Password fields should be the same' })
        }
        if (errors.length > 0) {
            const error = new Error('Invalid Input');
            error.data = errors;
            error.code = 422;
            throw error;
        }

        try {
            const existingUser = await User.findOne({ email: email })
            if (existingUser) {
                errors.push({ message: 'Email already exists, use another one' })
                const error = new Error('User exists allready')
                throw error
            }
            const hashedPassword = await bcrypt.hash(password, 12)
            const user = new User({
                firstname: firstname,
                lastname: lastname,
                email: email,
                password: hashedPassword,
            })
            const createdUser = await user.save()
            return { ...createdUser._doc, id: createdUser._id.toString() }
        } catch (err) {
            const error = new Error(err);
            error.data = errors;
            error.code = 422;
            throw error;
        }
    },
    login: async ({ email, password }, req) => {
        const errors = []
        if (!validator.isEmail(email)) {
            errors.push({ message: 'Please enter a valid email' })
        }
        if (errors.length > 0) {
            const error = new Error('Invalid Input')
            error.data = errors
            error.code = 422
            throw error;
        }

        try {
            const user = await User.findOne({ email: email })
            if (!user) {
                errors.push({ message: 'No user found with that email' })
                const error = new Error('No user found')
                throw error
            }
            const isEqual = await bcrypt.compare(password, user.password)
            if (!isEqual) {
                errors.push({ message: 'password is incorrect' })
                const error = new Error('Wrong Password')
                throw error
            }

            const token = jwt.sign({
                userId: user._id.toString(),
                email: user.email
            }, jwtSecret, { expiresIn: '1h' })
            return { token: token, user: { ...user._doc, id: user._id.toString() } }
        } catch (err) {
            const error = new Error(err);
            error.data = errors;
            error.code = 401;
            throw error;
        }

    },
    createPost: async ({ imageUrl, imagePublicId, caption }, req) => {

        if (!imageUrl) {
            const error = new Error('Image Required')
            error.code = 422
            throw error;
        }

        const post = new Post({
            owner: req.userId,
            imageUrl: imageUrl,
            imagePublicId: imagePublicId,
            caption: caption
        })

        const createdPost = await (await post.save()).populate('owner').execPopulate()

        return {
            ...createdPost._doc,
            id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toString(),
            updatedAt: createdPost.updatedAt.toString()
        }
    },

    getPosts: async ({ }, req) => {
        if (!req.isAuth) {
            const error = new Error("Not authenticated")
            error.code = 401
            throw error
        }
        const ALLPOSTS = []
        const posts = await Post.find().sort({ createdAt: -1 }).populate('owner').cursor()
        const comments = await posts.eachAsync(async function (doc) {
            const newestComment = await Comment.findOne().sort({ createdAt: -1 }).where('post').equals(doc._id).populate('author', '-password')
            const post = { ...doc._doc }
            post.newestComment = newestComment
            ALLPOSTS.push(post)
        })

        return {
            posts: ALLPOSTS.map(post => {
                return {
                    ...post,
                    _id: post._id.toString(),
                    createdAt: post.createdAt.toISOString(),
                    updatedAt: post.updatedAt.toISOString()
                }
            })
        }
    },
    createComment: async ({ postId, text }, req) => {
        if (!req.isAuth) {
            const error = new Error("Not authenticated")
            error.code = 401
            throw error
        }

        const post = await Post.findById(postId)

        if (!post) {
            const error = new Error("Post unavailable!")
            error.code = 404
            throw error
        }

        const comment = new Comment({
            post: postId,
            author: req.userId,
            text: text
        })


        const savedComment = await (await comment.save()).populate('author').populate('post').execPopulate()
        return {
            text: savedComment.text,
            author: { ...savedComment.author._doc, _id: savedComment.author._id.toString() },
            post: { ...savedComment.post._doc, _id: savedComment.post._id.toString() }
        }
    },
    likeAPost: async ({ postId }, req) => {
        if (!req.isAuth) {
            const error = new Error("Not authenticated")
            error.code = 401
            throw error
        }
        const post = await Post.findById(postId)

        if (!post) {
            const error = new Error("Post unavailable!")
            error.code = 404
            throw error
        }

        const liked = post.likes.findIndex((user) => {
            return user == req.userId
        })
        if (liked >= 0) {
            post.likes.splice(liked, 1)
        } else {
            post.likes.push(req.userId)
        }
        // post.likes.length = 0
        const likedPost = await post.save()
        return {
            ...likedPost._doc,
            _id: likedPost._id.toString(),
            createdAt: likedPost.createdAt.toISOString(),
            updatedAt: likedPost.updatedAt.toISOString()
        }
    },
    getSinglePost: async ({ postId }, req) => {
        if (!req.isAuth) {
            const error = new Error("Not authenticated")
            error.code = 401
            throw error
        }

        if (postId.length < 24) {
            const error = new Error('Post unavailable! Wrong URL')
            error.code = 404
            throw error
        }

        const post = await Post.findById(postId).populate('owner', '-email -password -friends -friendRequests').populate('likes', '-email -password -friends -friendRequests');

        if (!post) {
            const error = new Error('Post unavailable!')
            error.code = 404
            throw error
        }

        const comments = await Comment.find({ post: postId }).populate('author', '-email -password -friends -friendRequests')

        return {
            post: {
                ...post._doc,
                _id: post._id.toString(),
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString()
            },
            comments: comments.map((comment) => {
                return {
                    ...comment._doc, _id: comment._id.toString(), createdAt: comment.createdAt.toISOString(),
                    updatedAt: comment.updatedAt.toISOString()
                }
            })
        }
    },
    deleteAPost: async ({ postId }, req) => {
        if (!req.isAuth) {
            const error = new Error("Not authenticated")
            error.code = 401
            throw error
        }

        const post = await Post.findById(postId).populate('owner', '-email -password -friends -friendRequests')

        if (!post) {
            const error = new Error('Post unavailable!')
            error.code = 404
            throw error
        }

        if (req.userId.toString() !== post.owner._id.toString()) {
            const error = new Error('Not Authorized')
            error.code = 401
            throw error
        }



        const deletedPost = await Post.deleteOne(post)
        uploader.destroy(post.imagePublicId)
        return { ...post._doc, _id: post._id.toString() }
    }
}