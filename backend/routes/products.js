const router = require('express').Router();
const ProductModel = require('../models/product');
const authMiddleware = require('../middlewares/authorization');
const asyncHandler = require('../middlewares/asyncHandler');

router.post("/createProduct", authMiddleware, asyncHandler(async (req, res) => {
    try {
        const { name, amount, unit, type, description } = req.body;
        const product = await ProductModel.create({ name, amount, unit, type, description });
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

router.post("/addProducts", authMiddleware, asyncHandler(async (req, res) => {
    try {
        const {products} = req.body;
        
        for (const item of products) {
            
            
            const product = await ProductModel.findByPk(item.productId);
            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            }
            const newAmount = product.amount + item.amount;
        await product.update({ amount: newAmount });
        res.status(200).json(product);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

router.put("/updateProduct/:id", authMiddleware, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { name, amount, unit, type, description } = req.body;
        const product = await ProductModel.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        await product.update({ name, amount, unit, type, description });
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

router.delete("/deleteProduct/:id", authMiddleware, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const product = await ProductModel.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        await product.destroy();
        res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

router.get("/getProducts", authMiddleware, asyncHandler(async (req, res) => {
    try {
        const products = await ProductModel.findAll();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}));

module.exports = router;