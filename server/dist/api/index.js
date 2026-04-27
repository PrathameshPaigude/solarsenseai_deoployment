"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const predictionRoutes_1 = __importDefault(require("./predictionRoutes"));
const openMeteoRoutes_1 = __importDefault(require("./openMeteoRoutes"));
const gisRoutes_1 = __importDefault(require("./gisRoutes"));
const financialRoutes_1 = __importDefault(require("./financialRoutes"));
const carbonRoutes_1 = __importDefault(require("./carbonRoutes"));
const router = (0, express_1.Router)();
// API routes
router.use('/', predictionRoutes_1.default);
router.use('/', openMeteoRoutes_1.default);
router.use('/gis', gisRoutes_1.default);
router.use('/finance', financialRoutes_1.default);
router.use('/carbon', carbonRoutes_1.default);
exports.default = router;
