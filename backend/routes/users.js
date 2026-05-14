const router = require('express').Router();
const User = require('../models/user');
const authMiddleware = require('../middlewares/authorization');
const asyncHandler = require('../middlewares/asyncHandler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();


router.post('/login', asyncHandler(async (req, res) => {
    try {
        const {username, password} = req.body;
        const user = await User.findOne({where: {username}});
        if (!user) return res.status(404).json({error: 'User not found'});
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({error: 'Invalid password'});
        const token = jwt.sign({id: user.id, username: user.username}, process.env.JWT_SECRET, {expiresIn: '1h'});
        res.json({token, message: "Successfully authenticated"});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
}));

router.post('/addUser', asyncHandler(async (req, res) => {
    try {
        const {username, password} = req.body;
        const hashPassword = await bcrypt.hash(password, 10);
        const user = await User.create({username, password: hashPassword});
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({error: error.message});
    }
}));

module.exports = router;