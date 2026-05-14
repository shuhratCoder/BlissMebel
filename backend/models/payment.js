const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const Order = require("./order");

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    receivedAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    typeGet: {
      type: DataTypes.ENUM("cash", "card" , "transfer"),
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

Order.hasMany(Payment, {
  foreignKey: 'orderId',
  onDelete: 'CASCADE',
});

Payment.belongsTo(Order, {
  foreignKey: 'orderId',
});
module.exports = Payment;