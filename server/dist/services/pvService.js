"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GridProfiles = exports.PanelTechProfiles = exports.PV_SYSTEM_PRESETS = void 0;
exports.calculateSystemCapacity = calculateSystemCapacity;
exports.calculateCellTemperature = calculateCellTemperature;
exports.estimateMonthlyGHI = estimateMonthlyGHI;
exports.computePVFromZonalStats = computePVFromZonalStats;
exports.computePVForConfig = computePVForConfig;
exports.computePVWithMonthly = computePVWithMonthly;
/**
 * PV System Presets
 */
exports.PV_SYSTEM_PRESETS = {
    smallResidential: {
        name: 'smallResidential',
        displayName: 'Small Residential',
        panelEfficiency: 0.21, // Modern high-efficiency panels
        tilt: 25,
        azimuth: 180, // South-facing
        performanceRatio: 0.80,
        moduleArea: 1.7, // m² per module
        modulePowerW: 420,
        packingFactor: 0.9, // High usage of drawn area (assuming user draws roof)
        dcAcRatio: 1.2,
        temperatureCoefficient: -0.35, // %/°C
        noct: 45, // °C
    },
    mediumCommercial: {
        name: 'mediumCommercial',
        displayName: 'Medium Commercial',
        panelEfficiency: 0.21,
        tilt: 10, // Flat roof tilt
        azimuth: 180,
        performanceRatio: 0.82,
        moduleArea: 2.0, // Larger commercial modules
        modulePowerW: 550,
        packingFactor: 0.85, // Walkways and setbacks
        dcAcRatio: 1.25,
        temperatureCoefficient: -0.35,
        noct: 45,
    },
    groundMounted: {
        name: 'groundMounted',
        displayName: 'Ground-Mounted',
        panelEfficiency: 0.22, // Bifacial/High-perf
        tilt: 30, // Optimized tilt
        azimuth: 180,
        performanceRatio: 0.85,
        moduleArea: 2.6, // Large utility modules
        modulePowerW: 650,
        packingFactor: 0.5, // Row spacing (GCR ~0.5)
        dcAcRatio: 1.3,
        temperatureCoefficient: -0.3,
        noct: 45,
    },
    floatingLargeScale: {
        name: 'floatingLargeScale',
        displayName: 'Floating Large Scale',
        panelEfficiency: 0.21,
        tilt: 12, // Lower tilt for stability
        azimuth: 180,
        performanceRatio: 0.82,
        moduleArea: 2.0,
        modulePowerW: 500,
        packingFactor: 0.7, // Anchoring and maintenance paths
        dcAcRatio: 1.2,
        temperatureCoefficient: -0.35,
        noct: 40, // Water cooling effect
    },
};
exports.PanelTechProfiles = {
    mono: {
        temperatureCoefficient: -0.35, // Modern Mono PERC/TOPCon
        noct: 45,
        typicalEfficiency: 0.21,
        modulePowerW: 420,
        moduleArea: 1.7,
    },
    poly: {
        temperatureCoefficient: -0.40,
        noct: 45,
        typicalEfficiency: 0.17,
        modulePowerW: 400,
        moduleArea: 1.8,
    },
    thinfilm: {
        temperatureCoefficient: -0.25,
        noct: 44,
        typicalEfficiency: 0.13, // Lower efficiency but better temp coeff
        modulePowerW: 150,
        moduleArea: 1.2,
    },
};
exports.GridProfiles = {
    on_grid: {
        usableFraction: 1.0, // PVOUT already accounts for standard system losses (PR ~0.8)
        description: "Grid-tied system with net metering",
    },
    hybrid: {
        usableFraction: 0.95, // Slight efficiency loss from battery round-trip
        description: "Hybrid system with battery storage",
    },
    off_grid: {
        usableFraction: 0.85, // Significant battery/charge controller losses
        description: "Off-grid system with battery storage",
    },
};
/**
 * Calculate system capacity from area and module specs
 * Returns effective area, panel count, and DC/AC capacities
 */
function calculateSystemCapacity(area_m2, moduleArea, modulePowerW, packingFactor, dcAcRatio) {
    const area_eff = area_m2 * packingFactor;
    const num_panels = Math.floor(area_eff / moduleArea);
    const P_dc_kWp = (num_panels * modulePowerW) / 1000;
    const P_ac_kW = P_dc_kWp / dcAcRatio;
    return { area_eff, num_panels, P_dc_kWp, P_ac_kW };
}
/**
 * Calculate cell temperature from ambient temperature and irradiance
 * Uses NOCT (Nominal Operating Cell Temperature) model
 * @param T_amb_avg Average ambient temperature in °C
 * @param G_eff Effective irradiance in W/m² (e.g., POA irradiance)
 * @param NOCT Nominal Operating Cell Temperature in °C (typically 45°C)
 * @returns Cell temperature in °C
 */
function calculateCellTemperature(T_amb_avg, G_eff, NOCT) {
    // NOCT model: T_cell = T_amb + (NOCT - 20) / 800 * G_eff
    // Where 800 W/m² is the reference irradiance for NOCT
    // G_eff should be in W/m² (convert from kWh/m²/day if needed)
    return T_amb_avg + ((NOCT - 20) / 800) * G_eff;
}
/**
 * Estimate monthly GHI values from annual average based on latitude
 * Uses seasonal variation patterns typical for different latitudes
 */
function estimateMonthlyGHI(annualGHI, latitude) {
    // Normalize latitude to -90 to 90
    const lat = Math.max(-90, Math.min(90, latitude));
    // For tropical regions (near equator), less seasonal variation
    // For mid-latitudes, more seasonal variation
    // For high latitudes, extreme seasonal variation
    // Base seasonal factors (for Northern Hemisphere, adjust for Southern)
    // These represent typical monthly variation relative to annual average
    // Values are approximate multipliers for each month (Jan=0, Feb=1, ..., Dec=11)
    const baseFactors = [
        0.85, 0.90, 1.05, 1.10, 1.15, 1.20, // Jan-Jun (winter to summer)
        1.15, 1.10, 1.05, 0.95, 0.90, 0.85 // Jul-Dec (summer to winter)
    ];
    // Adjust variation based on latitude
    // Near equator (0-15°): minimal variation
    // Mid-latitudes (15-45°): moderate variation
    // High latitudes (45-90°): high variation
    const absLat = Math.abs(lat);
    let variationFactor = 1.0;
    if (absLat < 15) {
        // Tropical: minimal seasonal variation (±5%)
        variationFactor = 0.05;
    }
    else if (absLat < 30) {
        // Subtropical: low variation (±10%)
        variationFactor = 0.10;
    }
    else if (absLat < 45) {
        // Mid-latitude: moderate variation (±15%)
        variationFactor = 0.15;
    }
    else {
        // High latitude: high variation (±20%)
        variationFactor = 0.20;
    }
    // Apply variation to base factors
    const monthlyFactors = baseFactors.map((factor) => {
        // Normalize so average is 1.0
        const normalized = 1.0 + (factor - 1.0) * variationFactor;
        return normalized;
    });
    // Normalize factors to ensure annual average equals input
    const sum = monthlyFactors.reduce((a, b) => a + b, 0);
    const normalizedFactors = monthlyFactors.map((f) => f * 12 / sum);
    // For Southern Hemisphere, shift by 6 months
    let finalFactors = normalizedFactors;
    if (lat < 0) {
        finalFactors = [...normalizedFactors.slice(6), ...normalizedFactors.slice(0, 6)];
    }
    // Calculate monthly GHI values
    return finalFactors.map((factor) => annualGHI * factor);
}
/**
 * Compute PV output from zonal stats (v2.0 - PVWatts-style)
 */
function computePVFromZonalStats(area_m2, layers, systemConfig, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    // --- Step 1: Extract GSA Values ---
    const ghi_mean = ((_a = layers.GHI) === null || _a === void 0 ? void 0 : _a.mean) || 0;
    const dni_mean = (_b = layers.DNI) === null || _b === void 0 ? void 0 : _b.mean;
    const dif_mean = (_c = layers.DIF) === null || _c === void 0 ? void 0 : _c.mean;
    const gti_mean = (_d = layers.GTI) === null || _d === void 0 ? void 0 : _d.mean;
    const pvout_reference_kwh_kwp = (_e = layers.PVOUT) === null || _e === void 0 ? void 0 : _e.mean;
    const temp_mean = ((_f = layers.TEMP) === null || _f === void 0 ? void 0 : _f.mean) || 25; // Default to 25C if missing
    const opta_deg = (_g = layers.OPTA) === null || _g === void 0 ? void 0 : _g.mean;
    const elevation_m = (_h = layers.ELE) === null || _h === void 0 ? void 0 : _h.mean;
    // Extract monthly PVOUT if available
    const pvout_monthly_kwh_kwp = [];
    for (let i = 1; i <= 12; i++) {
        const key = `PVOUT_${String(i).padStart(2, '0')}`;
        if (layers[key]) {
            pvout_monthly_kwh_kwp.push(layers[key].mean);
        }
    }
    // --- Step 2: System Configuration ---
    const panelTechnology = (options === null || options === void 0 ? void 0 : options.panelTechnology) || 'mono';
    const gridType = (options === null || options === void 0 ? void 0 : options.gridType) || 'on_grid';
    // Get tech profile
    const techProfile = exports.PanelTechProfiles[panelTechnology];
    // Use tech-specific specs unless overridden by custom config
    const moduleArea = (_j = systemConfig.moduleArea) !== null && _j !== void 0 ? _j : techProfile.moduleArea;
    const modulePowerW = (_k = systemConfig.modulePowerW) !== null && _k !== void 0 ? _k : techProfile.modulePowerW;
    // Packing factor comes from System Type preset (e.g. Residential vs Commercial)
    const packingFactor = (_l = systemConfig.packingFactor) !== null && _l !== void 0 ? _l : 0.8;
    const dcAcRatio = (_m = systemConfig.dcAcRatio) !== null && _m !== void 0 ? _m : 1.15;
    // --- Step 3: Calculate System Capacity ---
    const { area_eff, num_panels, P_dc_kWp, P_ac_kW } = calculateSystemCapacity(area_m2, moduleArea, modulePowerW, packingFactor, dcAcRatio);
    const finalP_dc_kWp = (options === null || options === void 0 ? void 0 : options.installed_capacity_kWp) || P_dc_kWp;
    // --- Step 4: Tech-Specific Temperature Correction ---
    // Calculate f_tech_temp based on local temperature and tech coefficients
    // Reference: Mono (-0.35%/C)
    const gamma_tech = techProfile.temperatureCoefficient / 100; // Convert % to decimal
    const gamma_ref = -0.0035; // Reference Mono coefficient
    // Estimate average cell temperature
    // T_cell_avg ≈ T_amb + (NOCT - 20)
    const T_cell_avg = temp_mean + (techProfile.noct - 20);
    // Calculate relative performance factor
    // f = 1 + (gamma_tech - gamma_ref) * (T_cell - 25)
    let f_tech_temp = 1.0 + (gamma_tech - gamma_ref) * (T_cell_avg - 25);
    // Clamp to reasonable bounds (±5%)
    f_tech_temp = Math.max(0.9, Math.min(1.05, f_tech_temp));
    // --- Step 5: Calculate Annual Production ---
    let yearly_kWh_calibrated = 0;
    let specific_yield_kwh_kwp_calibrated = 0;
    let pvout_annual_specific_yield = 0;
    // Robust PVOUT calculation
    if (pvout_monthly_kwh_kwp.length === 12) {
        // Method A: Sum of monthly values
        // Check if monthly values are daily averages (e.g. ~4-5) or monthly totals (e.g. ~100-150)
        const monthlySum = pvout_monthly_kwh_kwp.reduce((a, b) => a + b, 0);
        if (monthlySum < 100) {
            // Assume daily averages -> convert to monthly totals
            // Simple approximation: multiply by 30.4375 days/month
            pvout_annual_specific_yield = monthlySum * 30.4375;
        }
        else {
            // Assume monthly totals
            pvout_annual_specific_yield = monthlySum;
        }
    }
    else if (pvout_reference_kwh_kwp && pvout_reference_kwh_kwp > 0) {
        // Method B: Annual reference
        if (pvout_reference_kwh_kwp < 10) {
            // Assume daily average -> convert to annual
            pvout_annual_specific_yield = pvout_reference_kwh_kwp * 365;
        }
        else {
            // Assume already annual
            pvout_annual_specific_yield = pvout_reference_kwh_kwp;
        }
    }
    else {
        // Fallback: GHI-based estimation
        const pr = systemConfig.performanceRatio;
        pvout_annual_specific_yield = ghi_mean * 365 * pr;
    }
    // Calculate Base Production
    const base_production = finalP_dc_kWp * pvout_annual_specific_yield;
    // Apply Tech Temp Correction
    yearly_kWh_calibrated = base_production * f_tech_temp;
    // Recalculate specific yield
    specific_yield_kwh_kwp_calibrated = yearly_kWh_calibrated / finalP_dc_kWp;
    // --- Sanity Check ---
    if (specific_yield_kwh_kwp_calibrated < 900 || specific_yield_kwh_kwp_calibrated > 2200) {
        console.warn(`[PVService] ⚠️ Suspicious Specific Yield: ${specific_yield_kwh_kwp_calibrated.toFixed(1)} kWh/kWp`);
        console.warn(`[PVService] Inputs: System=${finalP_dc_kWp.toFixed(1)}kWp, PVOUT_Ref=${pvout_reference_kwh_kwp}, Annual_Yield=${pvout_annual_specific_yield.toFixed(1)}`);
        // We don't throw to avoid crashing the UI, but we log heavily.
        // In strict mode, we might want to clamp or throw.
    }
    console.log('[PVService] Calculation Debug:', {
        P_dc_kWp: finalP_dc_kWp,
        PVOUT_Ref: pvout_reference_kwh_kwp,
        Is_Daily: pvout_reference_kwh_kwp && pvout_reference_kwh_kwp < 10,
        Annual_Specific_Yield: pvout_annual_specific_yield,
        Tech_Temp_Factor: f_tech_temp,
        Yearly_kWh: yearly_kWh_calibrated,
        Specific_Yield: specific_yield_kwh_kwp_calibrated
    });
    // --- Step 6: Grid Type Losses ---
    const gridProfile = exports.GridProfiles[gridType];
    const yearly_kWh_usable = yearly_kWh_calibrated * gridProfile.usableFraction;
    // --- Step 7: Monthly Distribution ---
    let monthly_kWh_usable = [];
    if (pvout_monthly_kwh_kwp.length === 12) {
        // Use GSA monthly shares
        const totalRaw = pvout_monthly_kwh_kwp.reduce((a, b) => a + b, 0);
        const shares = pvout_monthly_kwh_kwp.map(m => m / totalRaw);
        monthly_kWh_usable = shares.map(s => s * yearly_kWh_usable);
    }
    else {
        // Fallback: Estimate from latitude
        const lat = (options === null || options === void 0 ? void 0 : options.latitude) || 20;
        const monthlyGHI = estimateMonthlyGHI(ghi_mean, lat);
        const totalGHI = monthlyGHI.reduce((a, b) => a + b, 0);
        const shares = monthlyGHI.map(g => g / totalGHI);
        monthly_kWh_usable = shares.map(s => s * yearly_kWh_usable);
    }
    // --- Build Result ---
    return {
        // System Specs
        area_m2,
        area_effective_m2: area_eff,
        num_panels,
        P_dc_kWp: finalP_dc_kWp,
        P_ac_kW,
        panelTechnology,
        gridType,
        presetName: systemConfig.displayName,
        // Irradiance & Climate
        ghi_mean,
        dni_mean,
        dif_mean,
        gti_mean,
        temp_mean,
        opta_deg,
        elevation_m,
        pvout_reference_kwh_kwp,
        pvout_scale_factor: 1.0, // Deprecated/Unused in this new logic
        pvout_monthly_kwh_kwp: pvout_monthly_kwh_kwp.length === 12 ? pvout_monthly_kwh_kwp : undefined,
        // Tech Corrections
        f_tech_temp,
        // Energy
        daily_kWh_raw: yearly_kWh_usable / 365, // Derived for consistency
        yearly_kWh_raw: yearly_kWh_calibrated, // Raw before grid losses
        yearly_kWh_calibrated,
        yearly_kWh_usable,
        // Yields
        specific_yield_kwh_kwp_raw: specific_yield_kwh_kwp_calibrated,
        specific_yield_kwh_kwp_calibrated,
        // Efficiency
        performance_ratio: systemConfig.performanceRatio,
        static_losses_PR: systemConfig.performanceRatio,
        temperature_corrected_efficiency: systemConfig.panelEfficiency, // Placeholder
        // Monthly
        monthly_kWh_usable,
        // Meta
        model_version: "v2.1-tech-specific",
        // Legacy
        daily_kWh: yearly_kWh_usable / 365,
        yearly_kWh: yearly_kWh_usable,
        monthly_kWh: monthly_kWh_usable,
        installed_capacity_kWp: finalP_dc_kWp,
        n_panels: num_panels,
        dc_capacity_kWp: finalP_dc_kWp,
        ac_capacity_kW: P_ac_kW,
        kWh_per_kWp_per_year: specific_yield_kwh_kwp_calibrated,
        calibrated_yearly_kWh: yearly_kWh_calibrated,
        calibrated_kWh_per_kWp_per_year: specific_yield_kwh_kwp_calibrated,
        ghi_units: 'kWh/m²/day',
        irradiance_units: 'kWh/m²/day',
    };
}
/**
 * Compute PV for a specific panel technology and grid configuration (Phase 8)
 * This is a convenience wrapper that enriches computePVFromZonalStats with tech/grid behavior
 */
function computePVForConfig(area_m2, ghiStats, systemConfig, panelTechnology, gridType, options) {
    var _a, _b;
    // Get tech-specific parameters
    const techProfile = exports.PanelTechProfiles[panelTechnology];
    // Override temperature parameters if not set in systemConfig
    const finalSystemConfig = Object.assign(Object.assign({}, systemConfig), { temperatureCoefficient: (_a = systemConfig.temperatureCoefficient) !== null && _a !== void 0 ? _a : techProfile.temperatureCoefficient, noct: (_b = systemConfig.noct) !== null && _b !== void 0 ? _b : techProfile.noct });
    // Call the main computation function
    const result = computePVFromZonalStats(area_m2, { GHI: ghiStats }, finalSystemConfig, Object.assign(Object.assign({}, options), { panelTechnology,
        gridType }));
    return result;
}
/**
 * Compute PV output with monthly breakdown (Legacy/Wrapper)
 * @param area_m2 Area in square meters
 * @param ghi_mean Annual average GHI (kWh/m²/day)
 * @param monthly_ghi Array of 12 monthly GHI values (kWh/m²/day)
 * @param systemConfig PV system configuration
 */
function computePVWithMonthly(area_m2, ghi_mean, monthly_ghi, systemConfig) {
    // Create mock layers from inputs
    const layers = {
        GHI: { mean: ghi_mean, median: ghi_mean, min: ghi_mean, max: ghi_mean, std: 0, count: 1, units: 'kWh/m²/day' }
    };
    // Add monthly GHI as PVOUT (approximation for legacy support)
    monthly_ghi.forEach((ghi, i) => {
        const key = `PVOUT_${String(i + 1).padStart(2, '0')}`;
        // We don't have PVOUT (kWh/kWp) here, we have GHI (kWh/m2/day).
        // This wrapper is tricky. Let's just use the main function and let it estimate distribution if needed.
        // Or better, just call the main function with GHI and let it handle distribution.
    });
    return computePVFromZonalStats(area_m2, layers, systemConfig);
}
