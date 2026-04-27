"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCarbon = void 0;
const carbonService_1 = require("../services/carbonService");
const calculateCarbon = (req, res) => {
    try {
        const { annual_kWh } = req.body;
        if (annual_kWh === undefined || annual_kWh === null) {
            return res.status(400).json({ error: 'annual_kWh is required' });
        }
        const result = (0, carbonService_1.computeCarbonData)(Number(annual_kWh));
        return res.json(result);
    }
    catch (error) {
        console.error('Error calculating carbon data:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.calculateCarbon = calculateCarbon;
