const router = require('express').Router();
const clientModel = require('../models/client');
const orderModel = require("../models/order");
const paymentModel = require("../models/payment");
const deadlineModel = require("../models/deadline");
const authMiddleware = require('../middlewares/authorization');
const asyncHandler = require('../middlewares/asyncHandler');

router.post("/createClient", authMiddleware, asyncHandler(async (req, res) => {
    try {
        const { name, phone } = req.body;
        const client = await clientModel.create({ name, phone });
        res.status(201).json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

router.put("/updateClient/:id", authMiddleware, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone } = req.body;
        const client = await clientModel.findByPk(id); 
        if (!client) {
            return res.status(404).json({ error: "Client not found" });
        }
        await client.update({ name, phone });
        res.status(200).json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

router.delete("/deleteClient/:id", authMiddleware, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const client = await clientModel.findByPk(id);
        if (!client) {
            return res.status(404).json({ error: "Client not found" });
        }
        await client.destroy();
        res.status(200).json({ message: "Client deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

router.get("/getClients", authMiddleware, asyncHandler(async (req, res) => {
  try {

    const clients = await clientModel.findAll({
      include: [
        {
          model: orderModel,

          include: [
            {
              model: paymentModel,
            },
            {
              model: deadlineModel,
            },
          ],
        },
      ],

      order: [["createdAt", "DESC"]],
    });

    const formattedClients = clients.map((client) => {

      const orders = client.Orders || [];

      const totalOrders = orders.length;

      const totalDebt = orders.reduce((sum, order) => {

        const totalAmount =
          (order.serviceFee || 0) +
          (order.productsPrice || 0);

        const paidAmount =
          (order.Payments || []).reduce(
            (pSum, payment) =>
              pSum + payment.receivedAmount,
            0
          );

        return sum + (totalAmount - paidAmount);

      }, 0);

      return {
        ...client.toJSON(),

        totalOrders,

        totalDebt,
      };
    });

    res.status(200).json(formattedClients);

  } catch (error) {

    res.status(500).json({
      error: error.message,
    });

  }
}));

module.exports = router;