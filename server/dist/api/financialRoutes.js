"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const financialService_1 = require("../services/financialService");
const router = (0, express_1.Router)();
router.post('/compute', (req, res) => {
    try {
        const inputs = req.body;
        // Basic validation
        if (!inputs.systemSize_kWp || !inputs.annualOutput_kWh) {
            return res.status(400).json({ error: 'Missing required inputs: systemSize_kWp, annualOutput_kWh' });
        }
        const summary = (0, financialService_1.computeFinancialSummary)(inputs);
        res.json(summary);
    }
    catch (error) {
        console.error('Financial computation error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
exports.default = router;
