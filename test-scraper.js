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
Object.defineProperty(exports, "__esModule", { value: true });
var playwright_1 = require("playwright");
function testLawPayScraper() {
    return __awaiter(this, void 0, void 0, function () {
        var browser, context, page, articleLinks, url, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    browser = null;
                    context = null;
                    page = null;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 11, 12, 19]);
                    return [4 /*yield*/, playwright_1.chromium.launch({
                            headless: false
                        })];
                case 2:
                    browser = _a.sent();
                    return [4 /*yield*/, browser.newContext({
                            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                            viewport: { width: 1280, height: 800 },
                            deviceScaleFactor: 2
                        })];
                case 3:
                    context = _a.sent();
                    return [4 /*yield*/, context.newPage()];
                case 4:
                    page = _a.sent();
                    console.log('Starting LawPay blog scrape...');
                    // Start with the blog index page
                    return [4 /*yield*/, page.goto('https://www.lawpay.com/about/blog/', {
                            waitUntil: 'networkidle',
                            timeout: 30000
                        })];
                case 5:
                    // Start with the blog index page
                    _a.sent();
                    console.log('Blog index page loaded, gathering article links...');
                    return [4 /*yield*/, page.evaluate(function () {
                            return Array.from(document.querySelectorAll('a[href*="/blog/"]'))
                                .map(function (link) {
                                var href = link.getAttribute('href');
                                if (!href)
                                    return null;
                                return href.startsWith('http') ? href : "https://www.lawpay.com".concat(href);
                            })
                                .filter(function (href) {
                                return href &&
                                    href.includes('/blog/') &&
                                    !href.endsWith('/blog/') &&
                                    !href.includes('/category/') &&
                                    !href.includes('/tag/') &&
                                    !href.includes('/author/');
                            });
                        })];
                case 6:
                    articleLinks = _a.sent();
                    console.log("Found ".concat(articleLinks.length, " article links"));
                    if (!(articleLinks.length > 0)) return [3 /*break*/, 10];
                    url = articleLinks[0];
                    console.log("Processing article at ".concat(url));
                    return [4 /*yield*/, page.goto(url, {
                            waitUntil: 'networkidle',
                            timeout: 30000
                        })];
                case 7:
                    _a.sent();
                    // Wait for any content to be visible
                    console.log('Waiting for content...');
                    return [4 /*yield*/, page.waitForTimeout(5000)];
                case 8:
                    _a.sent(); // Give the page time to fully render
                    return [4 /*yield*/, page.evaluate(function () {
                            var _a, _b, _c, _d;
                            // Try to find the title
                            var titleSelectors = ['h1', '.post-title', '.entry-title', '.blog-title h1', 'article h1'];
                            var title = null;
                            for (var _i = 0, titleSelectors_1 = titleSelectors; _i < titleSelectors_1.length; _i++) {
                                var selector = titleSelectors_1[_i];
                                var element = document.querySelector(selector);
                                if (element) {
                                    title = (_a = element.textContent) === null || _a === void 0 ? void 0 : _a.trim();
                                    if (title)
                                        break;
                                }
                            }
                            // Try to find the date
                            var dateSelectors = ['.post-date', '.published-date', 'time', '.entry-date', '.date'];
                            var dateStr = null;
                            for (var _e = 0, dateSelectors_1 = dateSelectors; _e < dateSelectors_1.length; _e++) {
                                var selector = dateSelectors_1[_e];
                                var element = document.querySelector(selector);
                                if (element) {
                                    dateStr = (_b = element.textContent) === null || _b === void 0 ? void 0 : _b.trim();
                                    if (dateStr)
                                        break;
                                }
                            }
                            // Try to find the content
                            var contentSelectors = [
                                '.post-content p',
                                '.entry-content p',
                                '.blog-content p',
                                'article p',
                                '.post p',
                                'main p'
                            ];
                            var content = '';
                            for (var _f = 0, contentSelectors_1 = contentSelectors; _f < contentSelectors_1.length; _f++) {
                                var selector = contentSelectors_1[_f];
                                var paragraphs = Array.from(document.querySelectorAll(selector))
                                    .map(function (p) { var _a; return (_a = p.textContent) === null || _a === void 0 ? void 0 : _a.trim(); })
                                    .filter(function (text) { return text !== null && text !== ''; });
                                if (paragraphs.length > 0) {
                                    content = paragraphs.join('\n\n');
                                    break;
                                }
                            }
                            // Take a snapshot of the page structure
                            var pageStructure = {
                                hasH1: document.querySelector('h1') !== null,
                                hasArticle: document.querySelector('article') !== null,
                                hasMain: document.querySelector('main') !== null,
                                classes: Array.from(document.body.classList),
                                articleClasses: Array.from(((_c = document.querySelector('article')) === null || _c === void 0 ? void 0 : _c.classList) || []),
                                mainClasses: Array.from(((_d = document.querySelector('main')) === null || _d === void 0 ? void 0 : _d.classList) || [])
                            };
                            return {
                                title: title,
                                dateStr: dateStr,
                                contentLength: content.length,
                                firstParagraph: content.slice(0, 100) + '...',
                                pageStructure: pageStructure
                            };
                        })];
                case 9:
                    data = _a.sent();
                    console.log('Article data:', data);
                    _a.label = 10;
                case 10: return [3 /*break*/, 19];
                case 11:
                    error_1 = _a.sent();
                    console.error('Test failed:', error_1);
                    return [3 /*break*/, 19];
                case 12:
                    if (!page) return [3 /*break*/, 14];
                    return [4 /*yield*/, page.close()];
                case 13:
                    _a.sent();
                    _a.label = 14;
                case 14:
                    if (!context) return [3 /*break*/, 16];
                    return [4 /*yield*/, context.close()];
                case 15:
                    _a.sent();
                    _a.label = 16;
                case 16:
                    if (!browser) return [3 /*break*/, 18];
                    return [4 /*yield*/, browser.close()];
                case 17:
                    _a.sent();
                    _a.label = 18;
                case 18: return [7 /*endfinally*/];
                case 19: return [2 /*return*/];
            }
        });
    });
}
testLawPayScraper();
