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
exports.sampleGHI = sampleGHI;
exports.computePV = computePV;
exports.getPresets = getPresets;
exports.computeMonthlyPV = computeMonthlyPV;
const geoTiffService_1 = require("../services/geoTiffService");
const pvService_1 = require("../services/pvService");
/**
 * POST /api/gis/sample-ghi
 * Sample GHI (and optionally other layers) for a polygon
 */
function sampleGHI(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { polygonGeoJson, layers } = req.body;
            if (!polygonGeoJson) {
                return res.status(400).json({ error: 'polygonGeoJson is required' });
            }
            // Validate polygon format
            if (!polygonGeoJson.type || polygonGeoJson.type !== 'Polygon' || !polygonGeoJson.coordinates) {
                return res.status(400).json({ error: 'Invalid polygon format. Expected GeoJSON Polygon.' });
            }
            // Sample requested layers or default to ALL available layers (excluding ELE which is missing)
            const allLayers = ['GHI', 'DNI', 'DIF', 'PVOUT', 'GTI', 'OPTA', 'TEMP'];
            const layerNames = layers && Array.isArray(layers) && layers.length > 0 ? layers : allLayers;
            const results = yield (0, geoTiffService_1.sampleMultipleLayers)(layerNames, polygonGeoJson);
            // Check if GHI failed (critical layer)
            if (!results.GHI && layerNames.includes('GHI')) {
                // If GHI failed but we tried to sample it, it's a problem. 
                // But if we tried to sample everything, maybe just GHI is missing? 
                // Let's be lenient and return what we have, but warn if GHI is missing.
                console.warn('GHI layer sampling failed or returned no data.');
            }
            res.json({
                success: true,
                layers: results,
                polygon: polygonGeoJson,
            });
        }
        catch (error) {
            console.error('Error sampling layers:', error);
            res.status(500).json({
                error: 'Failed to sample GeoTIFF data',
                message: error.message,
            });
        }
    });
}
/**
 * POST /api/gis/compute-pv
 * Compute PV energy output from sampled GHI and system parameters
 */
function computePV(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const { polygonGeoJson, area_m2, ghi_mean, // Optional: if provided, skip sampling (legacy support)
            systemConfig, // PVSystemPreset or custom config
            installed_capacity_kWp, useTiltCorrection = false, latitude, longitude, panelTechnology = 'mono', gridType = 'on_grid', layers: providedLayers, // Optional: pre-sampled layers
             } = req.body;
            // Validate inputs
            if (!area_m2 || area_m2 <= 0) {
                return res.status(400).json({ error: 'area_m2 must be a positive number' });
            }
            let layers = providedLayers || {};
            // Sample layers if not provided
            if (!providedLayers) {
                if (!polygonGeoJson) {
                    // Legacy fallback: if only ghi_mean provided
                    if (ghi_mean) {
                        layers = {
                            GHI: {
                                mean: ghi_mean,
                                median: ghi_mean,
                                min: ghi_mean,
                                max: ghi_mean,
                                std: 0,
                                count: 1,
                                units: 'kWh/m²/day'
                            }
                        };
                    }
                    else {
                        return res.status(400).json({ error: 'Either layers, polygonGeoJson, or ghi_mean must be provided' });
                    }
                }
                else {
                    // Sample ALL layers needed for accurate analysis
                    const standardLayers = ['GHI', 'DNI', 'DIF', 'PVOUT', 'GTI', 'OPTA', 'TEMP', 'ELE'];
                    const monthlyLayers = Array.from({ length: 12 }, (_, i) => `PVOUT_${String(i + 1).padStart(2, '0')}`);
                    const allLayersToSample = [...standardLayers, ...monthlyLayers];
                    try {
                        layers = yield (0, geoTiffService_1.sampleMultipleLayers)(allLayersToSample, polygonGeoJson);
                    }
                    catch (error) {
                        console.error('Error sampling layers:', error);
                        // Fallback to just GHI if bulk sampling fails
                        const ghiPath = (0, geoTiffService_1.getGeoTIFFPath)('GHI');
                        const ghiStats = yield (0, geoTiffService_1.sampleGeoTIFFForPolygon)(ghiPath, polygonGeoJson);
                        layers = { GHI: ghiStats };
                    }
                }
            }
            // Get system configuration
            let pvConfig;
            if (systemConfig && typeof systemConfig === 'string') {
                // Preset name
                pvConfig = pvService_1.PV_SYSTEM_PRESETS[systemConfig] || pvService_1.PV_SYSTEM_PRESETS.smallResidential;
            }
            else if (systemConfig && typeof systemConfig === 'object') {
                // Custom config
                pvConfig = {
                    name: 'custom',
                    displayName: 'Custom',
                    panelEfficiency: (_a = systemConfig.panelEfficiency) !== null && _a !== void 0 ? _a : 0.18,
                    tilt: (_b = systemConfig.tilt) !== null && _b !== void 0 ? _b : 25,
                    azimuth: (_c = systemConfig.azimuth) !== null && _c !== void 0 ? _c : 180,
                    performanceRatio: (_d = systemConfig.performanceRatio) !== null && _d !== void 0 ? _d : 0.75,
                    moduleArea: systemConfig.moduleArea,
                    capacity_kWp: systemConfig.capacity_kWp,
                    packingFactor: systemConfig.packingFactor,
                };
            }
            else {
                pvConfig = pvService_1.PV_SYSTEM_PRESETS.smallResidential;
            }
            // Compute PV output using v2.0 function
            const pvResult = (0, pvService_1.computePVFromZonalStats)(area_m2, layers, pvConfig, {
                installed_capacity_kWp,
                latitude,
                longitude,
                useTiltCorrection,
                panelTechnology,
                gridType,
            });
            res.json({
                success: true,
                pv: pvResult,
                layers: layers, // Return all layers for UI display
                systemConfig: pvConfig,
            });
        }
        catch (error) {
            console.error('Error computing PV:', error);
            res.status(500).json({
                error: 'Failed to compute PV output',
                message: error.message,
            });
        }
    });
}
/**
 * GET /api/gis/presets
 * Get available PV system presets
 */
function getPresets(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            res.json({
                success: true,
                presets: pvService_1.PV_SYSTEM_PRESETS,
            });
        }
        catch (error) {
            res.status(500).json({
                error: 'Failed to get presets',
                message: error.message,
            });
        }
    });
}
/**
 * POST /api/gis/monthly-pv
 * Compute PV output with monthly breakdown
 */
function computeMonthlyPV(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const { polygonGeoJson, area_m2, systemConfig, installed_capacity_kWp, } = req.body;
            if (!polygonGeoJson || !area_m2) {
                return res.status(400).json({ error: 'polygonGeoJson and area_m2 are required' });
            }
            // Sample annual GHI
            const ghiStats = yield (0, geoTiffService_1.sampleGeoTIFFForPolygon)((0, geoTiffService_1.getGeoTIFFPath)('GHI'), polygonGeoJson);
            // Sample monthly PVOUT (or we can use monthly GHI if available)
            // For now, we'll estimate monthly GHI from annual and use representative values
            // In future, we can sample monthly GeoTIFFs if available
            const monthlyLayers = Array.from({ length: 12 }, (_, i) => `PVOUT_${String(i + 1).padStart(2, '0')}`);
            const monthlyStats = yield (0, geoTiffService_1.sampleMultipleLayers)(monthlyLayers, polygonGeoJson);
            // Convert monthly PVOUT to approximate monthly GHI
            // This is a simplification - ideally we'd have monthly GHI data
            const monthly_ghi = Array.from({ length: 12 }, (_, i) => {
                const monthKey = `PVOUT_${String(i + 1).padStart(2, '0')}`;
                const monthStats = monthlyStats[monthKey];
                // Rough conversion: assume PVOUT represents monthly energy
                // This would need calibration with actual monthly GHI data
                if (monthStats) {
                    // Approximate: monthly PVOUT (kWh/kWp) / 30 days / efficiency / PR ≈ monthly daily GHI
                    // This is very approximate
                    return ghiStats.mean; // For now, use annual average
                }
                return ghiStats.mean;
            });
            // Get system configuration
            let pvConfig;
            if (systemConfig && typeof systemConfig === 'string') {
                pvConfig = pvService_1.PV_SYSTEM_PRESETS[systemConfig] || pvService_1.PV_SYSTEM_PRESETS.smallResidential;
            }
            else if (systemConfig && typeof systemConfig === 'object') {
                pvConfig = {
                    name: 'custom',
                    displayName: 'Custom',
                    panelEfficiency: (_a = systemConfig.panelEfficiency) !== null && _a !== void 0 ? _a : 0.18,
                    tilt: (_b = systemConfig.tilt) !== null && _b !== void 0 ? _b : 25,
                    azimuth: (_c = systemConfig.azimuth) !== null && _c !== void 0 ? _c : 180,
                    performanceRatio: (_d = systemConfig.performanceRatio) !== null && _d !== void 0 ? _d : 0.75,
                    moduleArea: systemConfig.moduleArea,
                    capacity_kWp: systemConfig.capacity_kWp,
                };
            }
            else {
                pvConfig = pvService_1.PV_SYSTEM_PRESETS.smallResidential;
            }
            const pvResult = (0, pvService_1.computePVWithMonthly)(area_m2, ghiStats.mean, monthly_ghi, pvConfig);
            res.json({
                success: true,
                pv: pvResult,
                ghi: ghiStats,
                monthlyStats,
                systemConfig: pvConfig,
            });
        }
        catch (error) {
            console.error('Error computing monthly PV:', error);
            res.status(500).json({
                error: 'Failed to compute monthly PV output',
                message: error.message,
            });
        }
    });
}
