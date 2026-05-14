const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const Order = require("./order");

const Deadline = sequelize.define("Deadline", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

Order.hasOne(Deadline, {
  foreignKey: "orderId",
  onDelete: "CASCADE",
});

Deadline.belongsTo(Order, {
  foreignKey: "orderId",
});

module.exports = Deadline;
