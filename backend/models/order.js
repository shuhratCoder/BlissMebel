const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const Client = require("./client");

const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  serviceFee: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  productsPrice: {
    type: DataTypes.FLOAT,
  },
  description: {
    type: DataTypes.STRING,
  },
  products: {
    type: DataTypes.JSON,
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
});

Client.hasMany(Order, {
  foreignKey: "clientId",
  onDelete: "CASCADE",
});
Order.belongsTo(Client, {
  foreignKey: "clientId",
});

module.exports = Order;
