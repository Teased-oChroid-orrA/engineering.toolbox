"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solveCountersink = void 0;
exports.computeBushing = computeBushing;
const normalize_1 = require("./normalize");
const schema_1 = require("./schema");
const solveMath_1 = require("./solveMath");
Object.defineProperty(exports, "solveCountersink", { enumerable: true, get: function () { return solveMath_1.solveCountersink; } });
const solveEngine_1 = require("./solveEngine");
function computeBushing(raw) {
    const input = (0, normalize_1.normalizeBushingInputs)(raw);
    const validationWarnings = (0, schema_1.validateBushingInputs)(input);
    const state = (0, solveEngine_1.computeState)(input);
    const { warningCodes, warnings } = (0, solveEngine_1.buildWarnings)(validationWarnings, state);
    return (0, solveEngine_1.toOutput)(state, warningCodes, warnings);
}
