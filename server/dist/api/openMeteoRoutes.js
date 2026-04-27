"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const openMeteoService_1 = require("../services/openMeteoService");
const router = (0, express_1.Router)();
const openMeteoService = new openMeteoService_1.OpenMeteoService();
router.get('/solar-data', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const start = req.query.start;
    const end = req.query.end;
    console.log(`[/api/solar-data] Request: lat=${lat}, lng=${lng}, start=${start}, end=${end}`);
    if (isNaN(lat) || isNaN(lng)) {
        console.error('[/api/solar-data] Invalid coordinates');
        return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }
    try {
        console.log('[/api/solar-data] Calling OpenMeteoService...');
        const data = yield openMeteoService.getHourlySolarData(lat, lng, start, end);
        console.log('[/api/solar-data] Got data, sending response...');
        res.setHeader('Content-Type', 'application/json');
        res.json(data);
    }
    catch (err) {
        console.error('[/api/solar-data] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
}));
exports.default = router;
