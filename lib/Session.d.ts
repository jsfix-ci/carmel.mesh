import { Cache, Server, EVENT, SESSION_STATUS } from '.';
export declare class Session {
    private _id;
    private _revision;
    private _data;
    private _isBrowser;
    private _cache;
    private _status;
    private _config;
    private _listeners;
    private _dir;
    private _server;
    private _dispatch;
    private _handlers;
    constructor(config: any, dispatch?: any);
    get dir(): any;
    get handlers(): any;
    get revision(): string;
    get listeners(): any;
    get dispatch(): any;
    get config(): any;
    get id(): string;
    get server(): Server;
    get status(): SESSION_STATUS;
    get cache(): Cache;
    get data(): any;
    get isBrowser(): boolean;
    save(): Promise<void>;
    load(): Promise<void>;
    init(): Promise<void>;
    close(): Promise<void>;
    listen(onEvent: any): void;
    onEvent(type: EVENT, data: any): void;
    setStatus(s: SESSION_STATUS): void;
    get isReady(): boolean;
    toJSON(): {
        id: string;
        cid: string;
    };
    start(ipfs?: any): Promise<void>;
    stop(): Promise<void>;
}
