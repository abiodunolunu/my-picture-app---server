const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const graphqlSchema = require('./graphql/schema.js')
const graphqlResolver = require('./graphql/resolvers.js')
const mongoose = require('mongoose');
const dotenv = require('dotenv')
const helmet = require('helmet')
const morgan = require('morgan')
const cors = require('cors');
const graphqlHttp = require('express-graphql');
const auth = require('./middleware/auth');
const {cloudinaryConfig, dataUri, multerUploads, uploader} = require('./middleware/cloudinaryUpload')
dotenv.config({ path: './config/config.env' })

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
app.use(helmet())
app.use(morgan('combined', {stream: accessLogStream}))


app.use(bodyParser.json());
app.use(cors());
app.use(auth)



app.use('*', cloudinaryConfig)
app.use(multerUploads)


app.use('/api/graphql', graphqlHttp({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
        if (!err.originalError) {
            return err;
        }
        const data = err.originalError.data;
        const message = err.message || 'An error occured'
        const code = err.originalError.code || 500;
        console.log({ message: message, status: code, data: data })
        return { message: message, status: code, data: data }
    }
}))

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(__dirname + '/public'))
    app.get(/.*/, (req, res) => res.sendFile(__dirname + '/public/index.html'))
}

app.put('/api/post-image', (req, res, next) => {
    if (req.file) {
        const file = dataUri(req).content;
        return uploader.upload(file, {
            folder: "my-picture-app",
        }).then(result => {
            const imageUrl = result.url;
            const imagePublicId = result.public_id;
            res.status(200).json({
                imageUrl: imageUrl,
                imagePublicId: imagePublicId
            })
        })
    }
})

const PORT = process.env.PORT || 3000
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(result => {
    console.log('Database connected')
    return app.listen(PORT)
}).then(result => {
    console.log('App running @ ' + PORT)
})