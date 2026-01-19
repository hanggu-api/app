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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = __importDefault(require("axios"));
// Hardcoded for stability during integration test
var API_URL = 'https://projeto-central-backend.carrobomebarato.workers.dev/api';
var TEST_SECRET = 'maestro-v2-test-secret';
// Helper for Mock JWT (matching backend decodeJwt logic)
function generateMockToken(email, uid) {
    var header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString('base64').replace(/=/g, '');
    var payload = Buffer.from(JSON.stringify({ sub: uid, email: email, name: "Test User" })).toString('base64').replace(/=/g, '');
    return "header.".concat(payload, ".signature");
}
// Helper for delay
var delay = function (ms) { return new Promise(function (resolve) { return setTimeout(resolve, ms); }); };
function runFullCycleTest() {
    return __awaiter(this, void 0, void 0, function () {
        var clientEmail, providerEmail, password, clientToken, providerToken, providerId, serviceId, clientUid, cMockToken, regClientRes, e_1, providerUid, pMockToken, regProvRes, e_2, initialProfile, initialBalance, createRes, err_1, serviceData, completionCode, finalProfile, finalBalance, error_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('--- Starting Full Service Cycle Integration Test ---');
                    console.log("API URL: ".concat(API_URL));
                    clientEmail = "test_client_".concat(Date.now(), "@example.com");
                    providerEmail = "test_provider_".concat(Date.now(), "@example.com");
                    password = 'Password123!';
                    clientToken = '';
                    providerToken = '';
                    providerId = 0;
                    serviceId = '';
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 23, , 24]);
                    // 1. Register Client
                    console.log('[STEP 1] Registering Client...');
                    clientUid = "uid_client_".concat(Date.now());
                    cMockToken = generateMockToken(clientEmail, clientUid);
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/auth/register"), {
                            full_name: 'Test Client',
                            email: clientEmail,
                            password: password,
                            role: 'client',
                            phone: '11999998888',
                            token: cMockToken
                        })];
                case 3:
                    regClientRes = _d.sent();
                    clientToken = regClientRes.data.token || cMockToken;
                    console.log('✅ Client Registered.');
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _d.sent();
                    console.error('❌ Client Registration Failed:', e_1.message);
                    if (e_1.response) {
                        console.error('Response Status:', e_1.response.status);
                        console.error('Response Data:', JSON.stringify(e_1.response.data));
                    }
                    throw e_1;
                case 5:
                    // 2. Register Provider
                    console.log('[STEP 2] Registering Provider...');
                    providerUid = "uid_prov_".concat(Date.now());
                    pMockToken = generateMockToken(providerEmail, providerUid);
                    _d.label = 6;
                case 6:
                    _d.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/auth/register"), {
                            full_name: 'Test Provider',
                            email: providerEmail,
                            password: password,
                            role: 'provider',
                            phone: '11988887777',
                            commercial_name: 'Test Tech Services',
                            token: pMockToken
                        })];
                case 7:
                    regProvRes = _d.sent();
                    providerToken = regProvRes.data.token || pMockToken;
                    providerId = regProvRes.data.user.id;
                    console.log("\u2705 Provider Registered (ID: ".concat(providerId, ")."));
                    return [3 /*break*/, 9];
                case 8:
                    e_2 = _d.sent();
                    console.error('❌ Provider Registration Failed:', e_2.message);
                    if (e_2.response) {
                        console.error('Response Status:', e_2.response.status);
                        console.error('Response Data:', JSON.stringify(e_2.response.data));
                    }
                    throw e_2;
                case 9: return [4 /*yield*/, axios_1.default.get("".concat(API_URL, "/profile/me"), {
                        headers: { Authorization: "Bearer ".concat(providerToken) }
                    })];
                case 10:
                    initialProfile = _d.sent();
                    initialBalance = Number(initialProfile.data.user.wallet_balance || 0);
                    console.log("\uD83D\uDCB0 Initial Provider Balance: R$ ".concat(initialBalance.toFixed(2)));
                    // 3. Create Service Request (As Client)
                    console.log('3️⃣  Creating Service Request...');
                    return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/services"), {
                            category_id: 2, // Eletricista
                            description: 'Fixing electrical outlets - Integration Test',
                            latitude: -23.550520,
                            longitude: -46.633308,
                            address: 'Rua Teste, 100',
                            price_estimated: 100.0,
                            price_upfront: 30.0,
                            profession: 'Eletricista',
                            location_type: 'client'
                        }, {
                            headers: { Authorization: "Bearer ".concat(clientToken) }
                        })];
                case 11:
                    createRes = _d.sent();
                    serviceId = ((_a = createRes.data.service) === null || _a === void 0 ? void 0 : _a.id) || createRes.data.id;
                    console.log("\u2705 Service Created: ".concat(serviceId, " (Status: waiting_payment)"));
                    // 4. Force Payment Upfront (Initial)
                    console.log('4️⃣  Simulating Initial Payment approval...');
                    return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/test/force-payment-approval"), {
                            service_id: serviceId,
                            type: 'initial'
                        }, {
                            headers: { 'X-Test-Secret': TEST_SECRET }
                        })];
                case 12:
                    _d.sent();
                    console.log('✅ Payment Approved. Status should be pending.');
                    // 5. Provider Accepts Service
                    console.log('5️⃣  Provider Accepting Service...');
                    return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/services/").concat(serviceId, "/accept"), {}, {
                            headers: { Authorization: "Bearer ".concat(providerToken) }
                        })];
                case 13:
                    _d.sent();
                    console.log('✅ Service Accepted.');
                    // 6. Provider Arrives
                    console.log('6️⃣  Provider Recording Arrival...');
                    return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/services/").concat(serviceId, "/arrive"), {}, {
                            headers: { Authorization: "Bearer ".concat(providerToken) }
                        })];
                case 14:
                    _d.sent();
                    console.log('✅ Arrival recorded.');
                    // 7. Test Cancellation Block (Security Check)
                    console.log('7️⃣  Verifying Cancellation Block after Arrival...');
                    _d.label = 15;
                case 15:
                    _d.trys.push([15, 17, , 18]);
                    return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/services/").concat(serviceId, "/cancel"), {}, {
                            headers: { Authorization: "Bearer ".concat(clientToken) }
                        })];
                case 16:
                    _d.sent();
                    console.error('❌ FAILURE: Cancellation should have been blocked after arrival.');
                    process.exit(1);
                    return [3 /*break*/, 18];
                case 17:
                    err_1 = _d.sent();
                    if (((_b = err_1.response) === null || _b === void 0 ? void 0 : _b.status) === 403) {
                        console.log('✅ SUCCESS: Cancellation correctly blocked (403).');
                    }
                    else {
                        throw err_1;
                    }
                    return [3 /*break*/, 18];
                case 18:
                    // 8. Force Remaining Payment
                    console.log('8️⃣  Simulating Remaining Payment approval...');
                    return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/test/force-payment-approval"), {
                            service_id: serviceId,
                            type: 'remaining'
                        }, {
                            headers: { 'X-Test-Secret': TEST_SECRET }
                        })];
                case 19:
                    _d.sent();
                    console.log('✅ Remaining Payment Approved.');
                    return [4 /*yield*/, axios_1.default.get("".concat(API_URL, "/services/").concat(serviceId), {
                            headers: { Authorization: "Bearer ".concat(clientToken) }
                        })];
                case 20:
                    serviceData = _d.sent();
                    completionCode = serviceData.data.service.completion_code;
                    console.log("9\uFE0F\u20E3  Confirming Completion with code: ".concat(completionCode, "..."));
                    return [4 /*yield*/, axios_1.default.post("".concat(API_URL, "/services/").concat(serviceId, "/confirm-completion"), {
                            code: completionCode,
                            proof_video: 'https://example.com/test-proof-video.mp4'
                        }, {
                            headers: { Authorization: "Bearer ".concat(providerToken) }
                        })];
                case 21:
                    _d.sent();
                    console.log('✅ Service Completed.');
                    // 10. Verify Final Balance
                    console.log('🔟 Verifying Provider Earnings...');
                    return [4 /*yield*/, axios_1.default.get("".concat(API_URL, "/profile/me"), {
                            headers: { Authorization: "Bearer ".concat(providerToken) }
                        })];
                case 22:
                    finalProfile = _d.sent();
                    finalBalance = Number(finalProfile.data.user.wallet_balance || 0);
                    // Expected: 100 * 0.85 = 85.0 (assuming 15% commission)
                    console.log("\uD83D\uDCB0 Final Provider Balance: R$ ".concat(finalBalance.toFixed(2)));
                    if (finalBalance > initialBalance) {
                        console.log("\u2705 SUCCESS: Balance increased by R$ ".concat((finalBalance - initialBalance).toFixed(2), "."));
                    }
                    else {
                        console.error('❌ FAILURE: Balance did not increase.');
                        process.exit(1);
                    }
                    console.log('\n✨ ALL TESTS PASSED! FULL CYCLE VERIFIED. ✨');
                    return [3 /*break*/, 24];
                case 23:
                    error_1 = _d.sent();
                    console.error('💥 Test Failed:', ((_c = error_1.response) === null || _c === void 0 ? void 0 : _c.data) || error_1.message);
                    process.exit(1);
                    return [3 /*break*/, 24];
                case 24: return [2 /*return*/];
            }
        });
    });
}
runFullCycleTest();
