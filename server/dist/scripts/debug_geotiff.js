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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const geotiff_1 = require("geotiff");
function debugGeoTIFF(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`\n--- Inspecting ${path.basename(filePath)} ---`);
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return;
        }
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const tiff = yield (0, geotiff_1.fromArrayBuffer)(fileBuffer.buffer);
            const image = yield tiff.getImage();
            const width = image.getWidth();
            const height = image.getHeight();
            const bbox = image.getBoundingBox();
            const origin = image.getOrigin();
            const resolution = image.getResolution();
            const geoKeys = image.getGeoKeys();
            console.log(`Dimensions: ${width} x ${height}`);
            console.log(`Bounding Box: ${JSON.stringify(bbox)}`);
            console.log(`Origin: ${JSON.stringify(origin)}`);
            console.log(`Resolution: ${JSON.stringify(resolution)}`);
            console.log(`GeoKeys:`, geoKeys);
        }
        catch (error) {
            console.error('Error reading GeoTIFF:', error);
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const dataDir = path.join(process.cwd(), '../../India_GISdata_LTAym_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF/India_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF');
        yield debugGeoTIFF(path.join(dataDir, 'GHI.tif'));
        yield debugGeoTIFF(path.join(dataDir, 'OPTA.tif'));
        yield debugGeoTIFF(path.join(dataDir, 'ELE.tif'));
    });
}
main();
