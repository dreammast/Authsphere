"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VTU_EMAIL_REGEX = exports.PORTAL_AUDIENCE = void 0;
exports.isVelTechEmail = isVelTechEmail;
exports.PORTAL_AUDIENCE = ['lms', 'erp', 'library', 'email', 'admin'];
// ─── Validation ────────────────────────────────────────────────────────────
exports.VTU_EMAIL_REGEX = /^[a-z0-9.]+@veltech\.edu\.in$/i;
function isVelTechEmail(email) {
    return exports.VTU_EMAIL_REGEX.test(email);
}
