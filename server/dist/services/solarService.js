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
exports.SolarService = void 0;
const SolarIrradianceData_1 = require("../models/SolarIrradianceData"); // Assuming you have a model for solar irradiance data
class SolarService {
    constructor() {
        this.performanceRatio = 0.75; // Example performance ratio
    }
    predictEnergyGeneration(areaSqFt, panelEfficiency, location) {
        return __awaiter(this, void 0, void 0, function* () {
            const solarIrradiance = yield this.getSolarIrradianceData(location);
            const energyGeneration = this.calculateEnergy(areaSqFt, panelEfficiency, solarIrradiance);
            const carbonReduction = this.calculateCarbonReduction(energyGeneration);
            const estimatedSavings = this.calculateEstimatedSavings(energyGeneration);
            return {
                energyOutputKwh: energyGeneration,
                carbonReductionTons: carbonReduction,
                estimatedSavings: estimatedSavings,
            };
        });
    }
    getSolarIrradianceData(location) {
        return __awaiter(this, void 0, void 0, function* () {
            // Fetch solar irradiance data based on location
            const data = yield SolarIrradianceData_1.SolarIrradianceData.findOne({ location: location });
            return data ? data.averageSolarIrradiance : 0; // Return average solar irradiance or 0 if not found
        });
    }
    calculateEnergy(areaSqFt, panelEfficiency, solarIrradiance) {
        return areaSqFt * panelEfficiency * solarIrradiance * this.performanceRatio;
    }
    calculateCarbonReduction(energyKwh) {
        const carbonFactor = 0.0005; // Example carbon factor (tons of CO2 per kWh)
        return energyKwh * carbonFactor;
    }
    calculateEstimatedSavings(energyKwh) {
        const costPerKwh = 0.12; // Example cost per kWh
        return energyKwh * costPerKwh;
    }
}
exports.SolarService = SolarService;
