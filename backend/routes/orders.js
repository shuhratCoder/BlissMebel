const router = require("express").Router();

const orderModel = require("../models/order");
const productModel = require("../models/product");
const paymentModel = require("../models/payment");
const deadlineModel = require("../models/deadline");
const clientModel = require("../models/client");
const authMiddleware = require("../middlewares/authorization");
const asyncHandler = require("../middlewares/asyncHandler");
const sequelize = require("../db");

router.post("/createOrder", authMiddleware, asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      clientId,
      serviceFee,
      productsPrice,
      description,
      products,
      status,
      deadline,
      receivedAmount,
      typeGet,
    } = req.body;

    // PRODUCT MINUS
    if (products && products.length > 0) {
      for (const item of products) {
        const product = await productModel.findByPk(item.productId);

        if (!product) {
          await transaction.rollback();

          return res.status(404).json({
            error: `Product with ID ${item.productId} not found`,
          });
        }

        const newAmount = product.amount - item.amount;

        if (newAmount < 0) {
          await transaction.rollback();

          return res.status(400).json({
            error: `Not enough stock for ${product.name}`,
          });
        }

        await product.update(
          {
            amount: newAmount,
          },
          { transaction },
        );
      }
    }

    // CREATE ORDER
    const order = await orderModel.create(
      {
        clientId,
        serviceFee,
        productsPrice,
        description,
        products,
      },
      { transaction },
    );

    // DEBT
    if (status === "debt") {
      // PAYMENT
      await paymentModel.create(
        {
          orderId: order.id,
          receivedAmount,
          typeGet,
          description,
        },
        { transaction },
      );

      // DEADLINE
      await deadlineModel.create(
        {
          orderId: order.id,
          deadline,
          description,
        },
        { transaction },
      );
    }

    // FULL PAYMENT
    else if (status === "existent") {
      const totalAmount = serviceFee + productsPrice;

      await paymentModel.create(
        {
          orderId: order.id,
          receivedAmount: totalAmount,
          typeGet,
          description,
        },
        { transaction },
      );
    }

    await transaction.commit();

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    await transaction.rollback();

    res.status(500).json({
      error: error.message,
    });
  }
}));

router.get("/getOrders", authMiddleware, asyncHandler(async (req, res) => {
  try {

    const orders = await orderModel.findAll({
      include: [
        {
          model: clientModel,
        },
        {
          model: paymentModel,
        },
        {
          model: deadlineModel,
        },
      ],

      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(orders);

  } catch (error) {

    res.status(500).json({
      error: error.message,
    });

  }
}));

module.exports = router;
