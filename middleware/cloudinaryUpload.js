const path = require("path")
const { config, uploader } = require('cloudinary').v2
const multer = require('multer')
const DatauriParser = require('datauri/parser')


const fileStorage = multer.memoryStorage()
const parser = new DatauriParser()

const dataUri = req => {
    return parser.format(
        path.extname(req.file.originalname).toString(),
        req.file.buffer
    )
}

const cloudinaryConfig = (req, res, next) => {
    config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_Secret,
        use_filename: true
    })
    next()
}

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true)
    } else cb(null, false)
}


const multerUploads = multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")

module.exports = {
    uploader: uploader,
    cloudinaryConfig: cloudinaryConfig,
    multerUploads: multerUploads,
    dataUri: dataUri
}