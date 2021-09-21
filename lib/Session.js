"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
const nanoid_1 = require("nanoid");
const _1 = require(".");
const debug_1 = __importDefault(require("debug"));
const LOG = (0, debug_1.default)("carmel:session");
class Session {
    constructor(config, dispatch = undefined) {
        this._config = config || {};
        this._dispatch = dispatch;
        this._isBrowser = (typeof window !== 'undefined');
        this._cache = new _1.Cache(this.isBrowser, this.config.root);
        this._data = { account: new _1.Data(this, 'account') };
        this._status = _1.SESSION_STATUS.NEW;
        this._server = new _1.Server(this);
        this._id = "";
        this._handlers = this.config.handlers || {};
        this._revision = this.config.revision || `N/A-${Date.now()}`;
        this._listeners = [];
        Object.keys(this.config.data || {}).map(async (slice) => this._data[slice] = new _1.Data(this, slice));
    }
    get dir() {
        return this._dir;
    }
    get handlers() {
        return this._handlers;
    }
    get revision() {
        return this._revision;
    }
    get listeners() {
        return this._listeners;
    }
    get dispatch() {
        return this._dispatch;
    }
    get config() {
        return this._config;
    }
    get id() {
        return this._id;
    }
    get server() {
        return this._server;
    }
    get status() {
        return this._status;
    }
    get cache() {
        return this._cache;
    }
    get data() {
        return this._data;
    }
    get isBrowser() {
        return this._isBrowser;
    }
    async save() {
        await this.cache.put(`session/id`, this.id);
        await Promise.all(Object.keys(this.data || {}).map(async (slice) => this.data[slice].save()));
    }
    async load() {
        this._id = await this.cache.get(`session/id`) || (0, nanoid_1.nanoid)();
        await Promise.all(Object.keys(this.data || {}).map(async (slice) => this.data[slice].init()));
    }
    async init() {
        await this.load();
        await this.save();
    }
    async close() {
        await this.cache.close();
    }
    listen(onEvent) {
        this.listeners.push({ onEvent });
    }
    onEvent(type, data) {
        this.listeners.map((listener) => {
            listener.onEvent(type, (0, nanoid_1.nanoid)(), data);
        });
    }
    setStatus(s) {
        LOG(`changed status [status=${s}]`);
        this._status = s;
        this.onEvent(_1.EVENT.STATUS_CHANGED, s);
    }
    get isReady() {
        return this.status >= _1.SESSION_STATUS.READY;
    }
    toJSON() {
        return ({
            id: this.id,
            cid: this.id
        });
    }
    async start(ipfs) {
        LOG(`starting [revision=${this.revision}]`);
        this.setStatus(_1.SESSION_STATUS.INITIALIZING);
        await this.init();
        await this.server.start(ipfs);
        await this.save();
        this.setStatus(_1.SESSION_STATUS.READY);
    }
    async stop() {
        LOG(`stopping [revision=${this.revision}]`);
        this.setStatus(_1.SESSION_STATUS.STOPPING);
        await this.close();
        await this.server.stop();
        this.setStatus(_1.SESSION_STATUS.STOPPED);
    }
}
exports.Session = Session;
//# sourceMappingURL=Session.js.map