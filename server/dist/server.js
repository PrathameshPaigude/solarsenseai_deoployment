"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("./api")); // Import the central API router
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Debug: Log all requests to see what's being called
app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.path}`);
    next();
});
// SIMPLE TEST ROUTE - This MUST work if server is running
app.get('/api/test-route', (req, res) => {
    console.log('✅ TEST ROUTE HIT');
    res.json({ message: 'Server is working! Routes are accessible.', timestamp: new Date().toISOString() });
});
// TEMPORARY: Direct route handler with REAL GeoTIFF sampling
app.post('/api/gis/sample-ghi', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('✅ /api/gis/sample-ghi HIT - Starting GeoTIFF sampling...');
    try {
        const { polygonGeoJson, layers } = req.body;
        console.log('Request body received:', {
            hasPolygon: !!polygonGeoJson,
            polygonType: polygonGeoJson === null || polygonGeoJson === void 0 ? void 0 : polygonGeoJson.type,
            layers: layers || 'default',
        });
        if (!polygonGeoJson) {
            return res.status(400).json({ error: 'polygonGeoJson is required' });
        }
        // Import GeoTIFF service
        const { sampleGeoTIFFForPolygon, getGeoTIFFPath, sampleMultipleLayers } = yield Promise.resolve().then(() => __importStar(require('./services/geoTiffService')));
        console.log('GeoTIFF service imported successfully');
        const layerNames = layers && Array.isArray(layers) ? layers : ['GHI'];
        console.log('Sampling layers:', layerNames);
        // Get path to GHI file for debugging
        const ghiPath = getGeoTIFFPath('GHI');
        console.log('GHI GeoTIFF path:', ghiPath);
        // Sample the layers
        const results = yield sampleMultipleLayers(layerNames, polygonGeoJson);
        console.log('Sampling complete. Results:', Object.keys(results));
        if (!results.GHI && layerNames.includes('GHI')) {
            return res.status(404).json({ error: 'Could not sample GHI layer. Check if polygon overlaps with data coverage.' });
        }
        return res.json({
            success: true,
            layers: results,
            polygon: polygonGeoJson,
        });
    }
    catch (error) {
        console.error('❌ Error in sample-ghi:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            error: 'Failed to sample GeoTIFF data',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
}));
// Mount the API router (includes all sub-routes like /gis)
// The GIS routes are defined in src/api/gisRoutes.ts and use real GeoTIFF sampling
app.use('/api', api_1.default);
// Add a simple test route to verify server is responding
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
    console.log(`API routes available at /api/*`);
});
