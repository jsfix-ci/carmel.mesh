export enum SESSION_STATUS {
    NEW = "new",
    INITIALIZING = "init",
    READY = "ready",
    STOPPING = "stopping",
    STOPPED = "stopped",
    CONNECTING = "connecting",
    CONNECTED = "connected"
}

export enum DATATYPE {
    TABLE = "table",
    OBJECT = "object"
}

export enum EVENT {
    STATUS_CHANGED,
    USER_LOOKUP_DONE,
    USER_DATA_LOOKUP_DONE,
    USER_CREATED,
    USER_LOGIN,
    DATA_CHANGED
}

export type ACCOUNT = {
    username: string,
    signature: string,
    publicKey: string,
    cid: string,
    privateKey?: string
}

export interface IListener  {
    onEvent(type: EVENT, id: string, data: any): void
}

