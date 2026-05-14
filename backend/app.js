require('dotenv').config();

const express = require('express');
const sequelize = require('./db');

const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const clientRoutes = require('./routes/clients');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');

const app = express();

const PORT = process.env.PORT || 3008;

app.use(express.json());

app.use(helmet());

app.use(cors());

app.use(morgan('dev'));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});

app.use(limiter);

app.use('/mebel', userRoutes);
app.use('/mebel', productRoutes);
app.use('/mebel', clientRoutes);
app.use('/mebel', orderRoutes);
app.use('/mebel', paymentRoutes);

app.use((err, req, res, next) => {
    console.error(err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Server Error',
    });
});

async function start() {
    try {
        await sequelize.authenticate();

        await sequelize.sync({ alter: false });

        console.log('Database connected successfully');

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

start();