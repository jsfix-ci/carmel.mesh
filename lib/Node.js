"use strict";
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = exports.SYNC_INTERVAL = exports.IPFS_BROWSER_CONFIG = void 0;
const _1 = require(".");
const debug_1 = __importDefault(require("debug"));
const LOG = (0, debug_1.default)("carmel:node");
const MIN_OPERATORS_REQUIRED = 1;
const IPFS_BROWSER_CONFIG = (Swarm, repo) => {
    return {
        start: true,
        init: true,
        repo,
        EXPERIMENTAL: {
            pubsub: true
        },
        relay: {
            enabled: true,
            hop: {
                enabled: true
            }
        },
        config: {
            Addresses: {
                Swarm
            }
        }
    };
};
exports.IPFS_BROWSER_CONFIG = IPFS_BROWSER_CONFIG;
exports.SYNC_INTERVAL = 1000;
class Node {
    constructor(session) {
        this._session = session;
        this._cid = "";
        this._isBrowser = (typeof window !== 'undefined');
        this._listen = this.listen.bind(this);
        this._onEvent = this.onEvent.bind(this);
        this._onEventResult = this.onEventResult.bind(this);
        this._connected = false;
        this._sendQueue = [];
        this._isOperator = session.config.isOperator;
        this._swarm = { operators: {}, peers: {}, ipfs: {} };
        this.sync = this._sync.bind(this);
        this._send = { raw: this._sendRaw.bind(this) };
    }
    get connected() {
        return this._connected;
    }
    get sendQueue() {
        return this._sendQueue;
    }
    get syncTimer() {
        return this._syncTimer;
    }
    get session() {
        return this._session;
    }
    get mesh() {
        return this._mesh;
    }
    get ipfs() {
        return this._ipfs;
    }
    get ctl() {
        return this._ctl;
    }
    get cid() {
        return this._cid;
    }
    get isBrowser() {
        return this._isBrowser;
    }
    get isOperator() {
        return this._isOperator;
    }
    get send() {
        return this._send;
    }
    get isConnected() {
        return this._connected;
    }
    get swarm() {
        return this._swarm;
    }
    stopSyncTimer() {
        if (!this.syncTimer)
            return;
        clearInterval(this.syncTimer);
    }
    async _sync() {
        const ipfsPeers = await this.ipfs.swarm.peers() || [];
        const carmelOperators = await this.ipfs.pubsub.peers(`#carmel:events:${_1.SWARM_EVENT.ACCEPT.toLowerCase()}`) || [];
        this._connected = false;
        console.log(carmelOperators);
        if (!carmelOperators || carmelOperators.length < MIN_OPERATORS_REQUIRED) {
            LOG(`looking for Carmel Operators [found=${carmelOperators.length} required=${MIN_OPERATORS_REQUIRED}]`);
            return;
        }
        carmelOperators.map((op) => this._swarm.operators[op] = { timestamp: Date.now() });
        this._connected = true;
        this.session.onEvent(_1.EVENT.CONNECTED, carmelOperators);
        LOG(`connected [carmelOperators=${carmelOperators.length}]`);
        await this.flushSendQueue();
    }
    async flushSendQueue() {
        this._sendQueue = await this.session.cache.get("session/sendqueue") || [];
        if (this.sendQueue.length === 0)
            return;
        LOG(`flushing send queue [events=${this.sendQueue.length}]`);
        await Promise.all(this.sendQueue.map((m) => this.send.raw(m.type, m.event)));
        this._sendQueue = [];
        await this.session.cache.put("session/sendqueue", []);
        LOG(`send queue completely flushed`);
    }
    async addToSendQueue(e) {
        this._sendQueue = await this.session.cache.get("session/sendqueue") || [];
        this.sendQueue.push(e);
        await this.session.cache.put("session/sendqueue", this.sendQueue);
    }
    startSyncTimer() {
        this._syncTimer = setInterval(async () => {
            if (this.isConnected) {
                this.stopSyncTimer();
                return;
            }
            await this.sync();
        }, exports.SYNC_INTERVAL);
    }
    async ls(location) {
        var e_1, _a;
        if (!this.ipfs)
            return;
        let result = [];
        try {
            for (var _b = __asyncValues(this.ipfs.files.ls(`/carmel${location ? '/' + location : ''}`)), _c; _c = await _b.next(), !_c.done;) {
                const file = _c.value;
                result.push(file);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return result;
    }
    async open(id) {
        var e_2, _a;
        if (!this.ipfs)
            return;
        let content = "";
        try {
            try {
                for (var _b = __asyncValues(this.ipfs.files.read(`/carmel/${id}.json`)), _c; _c = await _b.next(), !_c.done;) {
                    const chunk = _c.value;
                    content = `${content}${Buffer.from(chunk).toString()}`;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) await _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            LOG(`opened content [id=${id}]`);
            return JSON.parse(content);
        }
        catch (_d) {
        }
    }
    async pull(id, cid) {
        if (!this.ipfs)
            return;
        try {
            // Remove the old file if present
            await this.ipfs.files.rm(`/carmel/${id}.json`, { recursive: true });
            LOG(`removed content [id=${id}]`);
        }
        catch (_a) {
        }
        try {
            await this.ipfs.files.cp(`/ipfs/${cid}`, `/carmel/${id}.json`);
            LOG(`pulled content [id=${id} cid=${cid}]`);
            return this.open(id);
        }
        catch (_b) {
        }
    }
    async push(id, data) {
        if (!this.ipfs)
            return;
        const content = JSON.stringify({
            timestamp: Date.now(),
            id,
            did: `did:carmel:${id}`,
            data
        });
        try {
            // Remove the old file if present
            await this.ipfs.files.rm(`/carmel/${id}.json`, { recursive: true });
            LOG(`removed content [id=${id}]`);
        }
        catch (_a) {
        }
        await this.ipfs.files.write(`/carmel/${id}.json`, new TextEncoder().encode(content), { create: true });
        const result = await this.ls(`${id}.json`);
        if (!result || result.length !== 1) {
            return;
        }
        const cid = result[0].cid.toString();
        await this.ipfs.pin.add(cid);
        LOG(`pushed content [id=${id} cid=${cid}]`);
        return ({
            cid,
            size: result[0].size,
            path: `/carmel/${id}.json`,
            id
        });
    }
    async onEvent(type, event) {
        LOG(`<- received event [type=${type}]`);
        // const handler = events[`${type.toLowerCase()}` as keyof typeof events]
        // if (!handler) return 
        // // Handle it
        // const result = await handler(this.session, event)
        // // Send the result back
        // const resultHandler = events[`${type.toLowerCase()}_result` as keyof typeof events]
        // // resultHandler && this.send.raw(`${type.toUpperCase()}_RESULT`, result)
        // return result
    }
    async onEventResult(type, event) {
        LOG(`<- received event result [type=${type}]`);
        // const handler = events[`${type.toLowerCase()}` as keyof typeof events]
        // if (!handler) return 
        // // Handle it
        // return handler(this.session, event)
    }
    async _sendRaw(type, event) {
        if (!this.ipfs)
            return;
        if (!this.isConnected) {
            LOG(`-> delaying event until connection is established [type=${type}]`);
            await this.addToSendQueue({ type, event });
            return;
        }
        this.ipfs.pubsub.publish(`#carmel:events:${type.toLowerCase()}`, JSON.stringify(event || {}));
        LOG(`=> sent event [type=${type}]`);
    }
    async listen(type, result = false) {
        LOG(`listen [event=${type}]`);
        this.ipfs.pubsub.subscribe(`#carmel:events:${type.toLowerCase()}`, (message) => {
            try {
                const { from, data } = message;
                const e = data.toString();
                if (from === this.cid)
                    return;
                result ? this._onEventResult(type, JSON.parse(e)) : this._onEvent(type, JSON.parse(e));
            }
            catch (err) { }
        });
    }
    async resolveMesh() {
        const relays = [{
                type: "webrtc-star",
                url: "carmel-relay0.chunky.io",
                port: 443
            }];
        const swarm = relays.filter((s) => s.type === 'webrtc-star').map((s) => `/dns4/${s.url}/tcp/${s.port || 443}/wss/p2p-webrtc-star`);
        this._mesh = {
            swarm
        };
        return this.mesh;
    }
    async startIPFS(ipfs) {
        try {
            if (!this.mesh || !this.mesh.swarm)
                return;
            let repo = `_ipfs`;
            if (this.isBrowser) {
                console.log("STARTING IPFS....");
                const ipfsLib = require('ipfs');
                this._ipfs = await ipfsLib.create((0, exports.IPFS_BROWSER_CONFIG)(this.mesh.swarm, repo));
                return;
            }
            if (!ipfs) {
                return;
            }
            this._ipfs = ipfs.api;
        }
        catch (e) {
            console.log(e);
        }
    }
    async start(ipfs) {
        LOG(`starting [browser=${this.isBrowser}]`);
        await this.resolveMesh();
        await this.startIPFS(ipfs);
        if (!this.ipfs)
            return;
        const { id } = await this.ipfs.id();
        this._cid = id;
        await Promise.all(Object.keys(_1.SWARM_EVENT).map((e) => {
            this._send[e.toLowerCase()] = async (props) => this._sendRaw(e, props || {});
            this.isOperator && this._listen(e);
            this.isOperator || this._listen(`${e}_RESULT`, true);
        }));
        await this.ipfs.files.mkdir('/carmel', { parents: true });
        LOG(`started ${this.isOperator ? 'as operator ' : ''}[cid=${this.cid} browser=${this.isBrowser}]`);
        if (this.isOperator) {
            return;
        }
        this.startSyncTimer();
        this.sync();
    }
}
exports.Node = Node;
//# sourceMappingURL=Node.js.map