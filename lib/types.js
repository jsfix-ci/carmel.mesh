"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWARM_EVENT = exports.WORK = exports.EVENT = exports.DATATYPE = exports.SESSION_STATUS = void 0;
var SESSION_STATUS;
(function (SESSION_STATUS) {
    SESSION_STATUS["NEW"] = "new";
    SESSION_STATUS["INITIALIZING"] = "init";
    SESSION_STATUS["READY"] = "ready";
    SESSION_STATUS["STOPPING"] = "stopping";
    SESSION_STATUS["STOPPED"] = "stopped";
})(SESSION_STATUS = exports.SESSION_STATUS || (exports.SESSION_STATUS = {}));
var DATATYPE;
(function (DATATYPE) {
    DATATYPE["TABLE"] = "table";
    DATATYPE["OBJECT"] = "object";
})(DATATYPE = exports.DATATYPE || (exports.DATATYPE = {}));
var EVENT;
(function (EVENT) {
    EVENT[EVENT["STATUS_CHANGED"] = 0] = "STATUS_CHANGED";
    EVENT[EVENT["USER_LOOKUP_DONE"] = 1] = "USER_LOOKUP_DONE";
    EVENT[EVENT["USER_DATA_LOOKUP_DONE"] = 2] = "USER_DATA_LOOKUP_DONE";
    EVENT[EVENT["USER_CREATED"] = 3] = "USER_CREATED";
    EVENT[EVENT["USER_LOGIN"] = 4] = "USER_LOGIN";
    EVENT[EVENT["DATA_CHANGED"] = 5] = "DATA_CHANGED";
    EVENT[EVENT["SYNC_DONE"] = 6] = "SYNC_DONE";
    EVENT[EVENT["CONNECTED"] = 7] = "CONNECTED";
    EVENT[EVENT["WORK_DONE"] = 8] = "WORK_DONE";
})(EVENT = exports.EVENT || (exports.EVENT = {}));
var WORK;
(function (WORK) {
    WORK[WORK["REGISTER"] = 0] = "REGISTER";
})(WORK = exports.WORK || (exports.WORK = {}));
var SWARM_EVENT;
(function (SWARM_EVENT) {
    SWARM_EVENT["ACCEPT"] = "ACCEPT";
    SWARM_EVENT["SYSTEM"] = "SYSTEM";
    SWARM_EVENT["PING"] = "PING";
})(SWARM_EVENT = exports.SWARM_EVENT || (exports.SWARM_EVENT = {}));
//# sourceMappingURL=types.js.map