"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Identity = void 0;
class Identity {
    constructor(session, data = {}) {
        this._session = session;
        this._username = data.username;
        this._publicKey = data.pub_key;
        this._revision = data.rev;
        this._did = data.did;
    }
    get did() {
        return this._did;
    }
    get session() {
        return this._session;
    }
    get username() {
        return this._username;
    }
    get publicKey() {
        return this._publicKey;
    }
    get revision() {
        return this._revision;
    }
    get data() {
        if (!this.username)
            return;
        return ({
            username: this.username,
            revision: this.revision,
            publicKey: this.publicKey,
            did: this.did
        });
    }
    async update(data, signer) {
        const remote = await this.session.fetchIdentity(data.username);
        const result = await this.session.server.push("identity", Object.assign({}, data));
        if (!result)
            return;
        const did = `${Identity.DID_PREFIX}:${result.cid}`;
        const signature = await signer(`${remote.revision + 1}:${did}`);
        this.session.server.send.system({
            call: "update",
            data: {
                username: data.username,
                signature,
                did
            }
        });
        this._username = data.username;
        this._publicKey = remote.publicKey;
        this._revision = remote.revision + 1;
        this._did = did;
    }
    async create(data, signer) {
        const result = await this.session.server.push("identity", data);
        if (!result)
            return;
        const did = `${Identity.DID_PREFIX}:${result.cid}`;
        this.session.server.send.system({
            call: "register",
            data: Object.assign(Object.assign({}, data), { did })
        });
        this._username = data.username;
        this._publicKey = data.publicKey;
        this._revision = 0;
        this._did = did;
    }
}
exports.Identity = Identity;
Identity.DID_PREFIX = "did:carmel";
//# sourceMappingURL=Identity.js.map