const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  unit: {
    type: DataTypes.ENUM("dona", "kg", "m", "m2", "litr"),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("whole","piece"),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
  },
});

module.exports = Product;
