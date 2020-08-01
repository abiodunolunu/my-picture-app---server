const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')
dotenv.config({ path: './config/config.env' })

module.exports = (req, res, next) => {
    const authHeader = req.get('Authorization')
    if (!authHeader) {
        req.isAuth = false
        return next()
    }
    
    const token = req.get('Authorization').split(' ')[1]
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.jwtSecret);
        // console.log(decodedToken)
    } catch (err) {
        req.isAuth = false
        return next()
    }
    if (!decodedToken) {
        req.isAuth = false
        return next()
    }

    req.userId = decodedToken.userId
    req.isAuth = true
    console.log(req.isAuth)
    next()
}