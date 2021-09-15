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
const REVISION = 'test-001';
class Session {
    constructor(config, dispatch = undefined) {
        this._config = config || {};
        this._dispatch = dispatch;
        this._isBrowser = (typeof window !== 'undefined');
        this._cache = new _1.Cache(this.isBrowser);
        this._data = { account: new _1.Data(this, 'account') };
        this._status = _1.SESSION_STATUS.NEW;
        this._node = new _1.Node(this);
        this._id = "";
        this._listeners = [];
        Object.keys(this.config.data || {}).map(async (slice) => this._data[slice] = new _1.Data(this, slice));
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
    get dir() {
        return this._dir;
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
    get node() {
        return this._node;
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
        LOG(`starting [revision=${REVISION}]`);
        console.log("SSTART SESSION2");
        this.setStatus(_1.SESSION_STATUS.INITIALIZING);
        await this.init();
        await this.node.start(ipfs);
        await this.save();
        this.setStatus(_1.SESSION_STATUS.READY);
    }
}
exports.Session = Session;
//# sourceMappingURL=Session.js.map