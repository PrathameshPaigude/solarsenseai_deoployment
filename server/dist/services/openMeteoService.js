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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenMeteoService = void 0;
const https_1 = __importDefault(require("https"));
class OpenMeteoService {
    constructor() {
        this.baseUrl = 'https://api.open-meteo.com/v1/forecast';
    }
    getHourlySolarData(lat, lng, start, end) {
        return __awaiter(this, void 0, void 0, function* () {
            // Default: today if not provided
            const today = new Date();
            const defaultEnd = today.toISOString().slice(0, 10);
            const defaultStart = defaultEnd; // Same day
            const startDate = start || defaultStart;
            const endDate = end || defaultEnd;
            try {
                const params = new URLSearchParams({
                    latitude: lat.toString(),
                    longitude: lng.toString(),
                    hourly: 'shortwave_radiation,direct_radiation,diffuse_radiation,direct_normal_irradiance,global_tilted_irradiance',
                    timezone: 'auto',
                    start_date: startDate,
                    end_date: endDate,
                });
                const url = `${this.baseUrl}?${params.toString()}`;
                console.log('OpenMeteoService: Fetching from:', url);
                const data = yield this.fetchUrl(url);
                console.log('OpenMeteoService: Received data successfully');
                return data;
            }
            catch (err) {
                console.error('OpenMeteoService error:', err.message);
                throw err;
            }
        });
    }
    fetchUrl(url) {
        return new Promise((resolve, reject) => {
            https_1.default.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    }
                    catch (err) {
                        const errMsg = err instanceof Error ? err.message : String(err);
                        reject(new Error(`Failed to parse JSON: ${errMsg}`));
                    }
                });
            }).on('error', (err) => {
                reject(new Error(`HTTP request failed: ${err.message}`));
            });
        });
    }
}
exports.OpenMeteoService = OpenMeteoService;
