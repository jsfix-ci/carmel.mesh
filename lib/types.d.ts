export declare enum SESSION_STATUS {
    NEW = "new",
    INITIALIZING = "init",
    READY = "ready"
}
export declare enum DATATYPE {
    TABLE = "table",
    OBJECT = "object"
}
export declare enum EVENT {
    STATUS_CHANGED = 0,
    USER_LOOKUP_DONE = 1,
    USER_DATA_LOOKUP_DONE = 2,
    USER_CREATED = 3,
    USER_LOGIN = 4,
    DATA_CHANGED = 5,
    SYNC_DONE = 6,
    CONNECTED = 7,
    WORK_DONE = 8
}
export declare enum WORK {
    REGISTER = 0
}
export declare enum SWARM_EVENT {
    ACCEPT = "ACCEPT",
    CREATE_ACCOUNT = "CREATE_ACCOUNT",
    UPDATE_ACCOUNT = "UPDATE_ACCOUNT"
}
export declare type ACCOUNT = {
    username: string;
    signature: string;
    publicKey: string;
    cid: string;
    privateKey?: string;
};
export interface IListener {
    onEvent(type: EVENT, id: string, data: any): void;
}
