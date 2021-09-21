"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.Server = exports.SYNC_INTERVAL = exports.IPFS_BROWSER_CONFIG = void 0;
const _1 = require(".");
const debug_1 = __importDefault(require("debug"));
const eos = __importStar(require("@carmel/eos"));
const LOG = (0, debug_1.default)("carmel:server");
const eventlog = (0, debug_1.default)("carmel:events");
const MIN_OPERATORS_REQUIRED = 1;
const DEFAULT_EOS_URL = "https://eos.greymass.com";
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
class Server {
    constructor(session) {
        this._session = session;
        this._cid = "";
        this._isBrowser = (typeof window !== 'undefined');
        this._listen = this.listen.bind(this);
        this._onEventRequest = this.onEventRequest.bind(this);
        this._onEventResponse = this.onEventResponse.bind(this);
        this._connected = false;
        this._sendQueue = [];
        this._isOperator = session.config.isOperator;
        this._mesh = { operators: [], peers: [], relays: [] };
        this.sync = this._sync.bind(this);
        this._send = { _: this._sendRaw.bind(this) };
    }
    get connected() {
        return this._connected;
    }
    get sendQueue() {
        return this._sendQueue;
    }
    get chain() {
        return this._chain;
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
    stopSyncTimer() {
        if (!this.syncTimer)
            return;
        clearInterval(this.syncTimer);
    }
    async _sync() {
        this._mesh.operators = [];
        this._mesh.peers = [];
        this._connected = false;
        const ipfsPeers = await this.ipfs.swarm.peers() || [];
        const carmelOperators = await this.ipfs.pubsub.peers(`#carmel:events:req:${_1.SWARM_EVENT.ACCEPT.toLowerCase()}`) || [];
        this._mesh.peers = ipfsPeers.map((p) => p.peer);
        if (!carmelOperators || carmelOperators.length < MIN_OPERATORS_REQUIRED) {
            LOG(`looking for Carmel Operators [found=${carmelOperators.length} required=${MIN_OPERATORS_REQUIRED}]`);
            return;
        }
        this._mesh.operators = carmelOperators;
        this._connected = true;
        this.session.onEvent(_1.EVENT.CONNECTED, this.mesh);
        LOG(`connected to the Carmel Mesh [operators=${this.mesh.operators.length} peers=${this.mesh.peers.length} relays=${this.mesh.relays.length}]`);
        this.mesh.operators.map((s, i) => LOG(`   operator ${i}: ${s}`));
        this.mesh.relays.map((s, i) => LOG(`   relay ${i}: ${s}`));
        this.mesh.peers.map((s, i) => LOG(`   peer ${i}: ${s}`));
        await this.flushSendQueue();
    }
    async flushSendQueue() {
        this._sendQueue = await this.session.cache.get("session/sendqueue") || [];
        if (this.sendQueue.length === 0)
            return;
        LOG(`flushing send queue [events=${this.sendQueue.length}]`);
        await Promise.all(this.sendQueue.map((m) => this.send._(m.type, m.event, m.isResponse)));
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
    async onEventRequest(type, event, session) {
        LOG(`<- received [${type}] request`);
        const handler = session.handlers[`${type.toLowerCase()}`];
        if (!handler) {
            LOG(`   [ skipped ] could not find event handler`);
            return;
        }
        // Handle it
        const result = await handler.request({ session, event, eventlog });
        // Send the result back
        this.send[type.toLowerCase()](result);
    }
    async onEventResponse(type, event, session) {
        LOG(`<- received [${type}] response`);
        const handler = session.handlers[`${type.toLowerCase()}`];
        if (!handler) {
            LOG(`   [ skipped ] could not find event handler`);
            return;
        }
        // Handle it
        await handler.response({ session, event, eventlog });
    }
    async _sendRaw(type, event, isResponse = false) {
        if (!this.ipfs)
            return;
        const fullType = `${isResponse ? 'res' : 'req'}:${type}`.toLowerCase();
        if (!this.isOperator && !this.isConnected) {
            LOG(`-> delaying event until connection is established [${fullType}]`);
            await this.addToSendQueue({ type, event, isResponse });
            return;
        }
        this.ipfs.pubsub.publish(`#carmel:events:${fullType}`, JSON.stringify(event || {}));
        LOG(`-> sent [${type.toLowerCase()}] ${isResponse ? 'response' : 'request'}`);
    }
    async listen(type, response = false) {
        LOG(`listening for [${type.toLowerCase()}] ${response ? 'responses' : 'requests'}`);
        const fullType = `${response ? 'res' : 'req'}:${type}`.toLowerCase();
        this.ipfs.pubsub.subscribe(`#carmel:events:${fullType}`, (message) => {
            try {
                const { from, data } = message;
                const e = data.toString();
                if (from === this.cid)
                    return;
                response ? this._onEventResponse(type.toLowerCase(), JSON.parse(e), this.session) : this._onEventRequest(type.toLowerCase(), JSON.parse(e), this.session);
            }
            catch (err) { }
        });
    }
    async resolveRelays() {
        if (this.mesh.relays.length > 0) {
            return;
        }
        LOG(`resolving relays ...`);
        this._mesh.relays = [];
        const relays = [{
                type: "webrtc-star",
                url: "carmel-relay0.chunky.io",
                port: 443
            }];
        this._mesh.relays = relays.filter((s) => s.type === 'webrtc-star').map((s) => `/dns4/${s.url}/tcp/${s.port || 443}/wss/p2p-webrtc-star`);
        LOG(`resolved relays (${this.mesh.relays.length})`);
        this.mesh.relays.map((s, i) => LOG(`   relay ${i}: ${s}`));
        return this.mesh.relays;
    }
    async startIPFS(ipfs) {
        try {
            if (!this.mesh || !this.mesh.relays)
                return;
            if (this.isBrowser) {
                const ipfsLib = require('ipfs');
                this._ipfs = await ipfsLib.create((0, exports.IPFS_BROWSER_CONFIG)(this.mesh.relays, `${this.session.cache.root}/ipfs`));
                return;
            }
            if (!ipfs) {
                return;
            }
            this._ipfs = ipfs.api;
        }
        catch (e) {
            LOG(`Could not start IPFS [Error: ${e.message}]`);
        }
    }
    async connectToEOS() {
        if (!this.isOperator || !this.session.config.eos) {
            LOG(`not connected to EOS`);
            return;
        }
        this._chain = Object.assign({ account: this.session.config.eos.account, eos }, eos.chain({
            url: this.session.config.eos.url || DEFAULT_EOS_URL,
            keys: this.session.config.eos.keys,
        }));
        LOG(`connected to EOS [account=${this.chain.account}]`);
    }
    async start(ipfs) {
        LOG(`starting [browser=${this.isBrowser}]`);
        await this.resolveRelays();
        await this.startIPFS(ipfs);
        if (!this.ipfs)
            return;
        const { id } = await this.ipfs.id();
        this._cid = id;
        await Promise.all(Object.keys(_1.SWARM_EVENT).map((e) => {
            // Operators send responses and non-operators send requests
            this._send[e.toLowerCase()] = async (props) => this._sendRaw(e, props || {}, this.isOperator);
            // Operators listen for event requests
            this.isOperator && this._listen(e);
            // Non-operators listen for event responses
            this.isOperator || this._listen(e, true);
        }));
        await this.ipfs.files.mkdir('/carmel', { parents: true });
        LOG(`started ${this.isOperator ? 'as operator ' : ''}[cid=${this.cid} browser=${this.isBrowser}]`);
        await this.connectToEOS();
        if (this.isOperator) {
            return;
        }
        this.startSyncTimer();
        this.sync();
    }
    async stop() {
        this.stopSyncTimer();
    }
}
exports.Server = Server;
//# sourceMappingURL=Server.js.map