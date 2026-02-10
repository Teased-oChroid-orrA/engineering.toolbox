"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildBushingViewModel = buildBushingViewModel;
function buildBushingViewModel(form, results) {
    return {
        ...form,
        geometry: results?.geometry,
        csSolved: results?.csSolved
    };
}
