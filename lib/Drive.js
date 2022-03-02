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
exports.Drive = void 0;
const debug_1 = __importDefault(require("debug"));
const recursive_readdir_1 = __importDefault(require("recursive-readdir"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const LOG = (0, debug_1.default)("carmel:drive");
class Drive {
    constructor(session) {
        this._session = session;
        this._push = this.push.bind(this);
        this._pull = this.pull.bind(this);
    }
    get session() {
        return this._session;
    }
    get ipfs() {
        return this.session.gateway.ipfs;
    }
    async ls(location) {
        var e_1, _a;
        if (!this.ipfs)
            return;
        let result = [];
        try {
            for (var _b = __asyncValues(this.ipfs.files.ls(`${Drive.ROOT}${location ? '/' + location : ''}`)), _c; _c = await _b.next(), !_c.done;) {
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
                for (var _b = __asyncValues(this.ipfs.files.read(`${Drive.ROOT}/${id}.json`)), _c; _c = await _b.next(), !_c.done;) {
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
            await this.ipfs.files.rm(`${Drive.ROOT}/${id}.json`, { recursive: true });
            LOG(`removed content [id=${id}]`);
        }
        catch (_a) {
        }
        try {
            await this.ipfs.files.cp(`/ipfs/${cid}`, `${Drive.ROOT}/${id}.json`);
            LOG(`pulled content [id=${id} cid=${cid}]`);
            return this.open(id);
        }
        catch (_b) {
        }
    }
    async _readDir(dir) {
        const ignores = ['.DS_Store'];
        let files = await (0, recursive_readdir_1.default)(dir);
        files = files.filter(file => !ignores.includes(path_1.default.basename(file))).map(file => {
            const info = fs_extra_1.default.statSync(file);
            return {
                path: path_1.default.relative(dir, file),
                content: fs_extra_1.default.readFileSync(file),
                mtime: info.mtime
            };
        });
        return files;
    }
    async pushDir(dir, base) {
        LOG(`pushing dir ${dir} ...`);
        const files = await this._readDir(dir);
        await Promise.all(files.map(file => this.ipfs.files.write(`${Drive.ROOT}/${base}/${file.path}`, file.content, {
            parents: true, create: true, mtime: file.mtime
        })));
        LOG(`pushed ${files.length} files`);
        const result = await this.ipfs.files.stat(`${Drive.ROOT}/${base}`);
        return result;
    }
    async push(id, data) {
        LOG(`pushing ${id} ...`);
        if (!this.ipfs)
            return;
        const content = JSON.stringify({
            timestamp: Date.now(),
            id,
            data
        });
        try {
            // Remove the old file if present
            await this.ipfs.files.rm(`${Drive.ROOT}/${id}.json`, { recursive: true });
            LOG(`removed content [id=${id}]`);
        }
        catch (_a) {
        }
        await this.ipfs.files.write(`${Drive.ROOT}/${id}.json`, new TextEncoder().encode(content), { create: true });
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
            path: `${Drive.ROOT}/${id}.json`,
            id
        });
    }
    async mount() {
        LOG("mouting drive ...");
        await this.ipfs.files.mkdir(Drive.ROOT, { parents: true });
        LOG("mounted drive");
    }
    async unmount() {
        LOG("unmounting drive ...");
        LOG("unmounted drive");
    }
}
exports.Drive = Drive;
Drive.ROOT = "/carmel";
//# sourceMappingURL=Drive.js.map