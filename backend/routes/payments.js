const router = require('express').Router();
const OrderModel = require('../models/order');
const PaymentModel = require('../models/payment');
const authMiddleware = require('../middlewares/authorization');
const asyncHandler = require('../middlewares/asyncHandler');

router.post("/rePayment",authMiddleware, asyncHandler(async (req, res) => {
    try {
        const { orderId, receivedAmount, description, typeGet } = req.body;
        const order = await OrderModel.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        const payment = await PaymentModel.create({ orderId, receivedAmount, description, typeGet });
        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }   
}));

module.exports = router;