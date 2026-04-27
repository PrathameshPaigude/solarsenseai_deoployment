"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFinancialSummary = computeFinancialSummary;
// --- Helper: Smart CAPEX Defaults ---
function getDefaultCapexPerkWp(gridType = "on_grid", systemSize_kWp) {
    if (gridType === "hybrid") {
        return 130000; // Mid-range for hybrid
    }
    if (gridType === "off_grid") {
        return 80000; // Off-grid with batteries
    }
    // On-grid defaults based on size
    if (systemSize_kWp <= 10)
        return 65000; // Small residential
    if (systemSize_kWp <= 100)
        return 52000; // Commercial rooftop
    return 45000; // Large / Ground-mount
}
function getTechCostFactor(panelTech = "mono") {
    switch (panelTech) {
        case "mono": return 1.00;
        case "poly": return 0.96;
        case "thinfilm": return 0.95;
        default: return 1.00;
    }
}
function computeFinancialSummary(inputs) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    // 1. Set Defaults
    const tariff0 = (_a = inputs.tariff_Rs_per_kWh) !== null && _a !== void 0 ? _a : 8.5;
    const om0 = (_b = inputs.om_Rs_per_kWp_per_year) !== null && _b !== void 0 ? _b : 800;
    const lifetime = (_c = inputs.projectLifetime_years) !== null && _c !== void 0 ? _c : 25;
    const degradation = ((_d = inputs.energyDegradation_pct_per_year) !== null && _d !== void 0 ? _d : 0.7) / 100;
    const tariffInflation = ((_e = inputs.tariffInflation_pct_per_year) !== null && _e !== void 0 ? _e : 3.0) / 100;
    const omInflation = ((_f = inputs.omInflation_pct_per_year) !== null && _f !== void 0 ? _f : 3.0) / 100;
    const gridEmission = (_g = inputs.gridEmission_kgCO2_per_kWh) !== null && _g !== void 0 ? _g : 0.82;
    // 2. Determine CAPEX
    const baseCapex = getDefaultCapexPerkWp(inputs.gridType, inputs.systemSize_kWp);
    const techFactor = getTechCostFactor(inputs.panelTechnology);
    const capexEffective = ((_h = inputs.capex_Rs_per_kWp) !== null && _h !== void 0 ? _h : baseCapex) * techFactor;
    const totalCapex_Rs = inputs.systemSize_kWp * capexEffective;
    // 3. Sanity Check
    const specificYield = inputs.annualOutput_kWh / inputs.systemSize_kWp;
    if (specificYield < 700 || specificYield > 2200) {
        console.warn(`[FinancialService] Suspicious specific yield: ${specificYield.toFixed(1)} kWh/kWp. Normal range: 700-2200.`);
    }
    // 4. Calculate Cashflows
    const years = [];
    let cumulativeCashflow_Rs = -totalCapex_Rs;
    // Year 0 (Investment)
    years.push({
        year: 0,
        output_kWh: 0,
        tariff_Rs_per_kWh: tariff0,
        grossSavings_Rs: 0,
        omCost_Rs: 0,
        netSavings_Rs: 0,
        cumulativeCashflow_Rs,
    });
    let paybackYears = null;
    for (let y = 1; y <= lifetime; y++) {
        // Degraded Output
        const output_kWh = inputs.annualOutput_kWh * Math.pow(1 - degradation, y - 1);
        // Escalated Rates
        const tariff_y = tariff0 * Math.pow(1 + tariffInflation, y - 1);
        const omRate_y = om0 * Math.pow(1 + omInflation, y - 1);
        // Financials
        const grossSavings_Rs = output_kWh * tariff_y;
        const omCost_Rs = inputs.systemSize_kWp * omRate_y;
        const netSavings_Rs = grossSavings_Rs - omCost_Rs;
        const prevCumulative = cumulativeCashflow_Rs;
        cumulativeCashflow_Rs += netSavings_Rs;
        years.push({
            year: y,
            output_kWh,
            tariff_Rs_per_kWh: tariff_y,
            grossSavings_Rs,
            omCost_Rs,
            netSavings_Rs,
            cumulativeCashflow_Rs,
        });
        // Payback Interpolation
        if (paybackYears === null && prevCumulative < 0 && cumulativeCashflow_Rs >= 0) {
            const fraction = Math.abs(prevCumulative) / netSavings_Rs;
            paybackYears = (y - 1) + fraction;
        }
    }
    // 5. Summary Metrics
    const firstYearNetSavings_Rs = ((_j = years[1]) === null || _j === void 0 ? void 0 : _j.netSavings_Rs) || 0;
    const co2Avoided_tons_per_year = (inputs.annualOutput_kWh * gridEmission) / 1000;
    return {
        totalCapex_Rs,
        firstYearNetSavings_Rs,
        paybackYears,
        co2Avoided_tons_per_year,
        years,
        inputs: Object.assign(Object.assign({}, inputs), { capex_Rs_per_kWp: capexEffective }) // Return effective CAPEX
    };
}
