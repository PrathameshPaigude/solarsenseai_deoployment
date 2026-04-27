"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const carbonController_1 = require("../controllers/carbonController");
const router = (0, express_1.Router)();
router.post('/calculate', carbonController_1.calculateCarbon);
exports.default = router;
