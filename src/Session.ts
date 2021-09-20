import { nanoid } from 'nanoid'
import { 
    Cache, 
    Data,
    IListener,
    Server,
    EVENT,
    SESSION_STATUS
} from '.'
import debug from 'debug'

const LOG = debug("carmel:session")

export class Session {
    private _id: string 
    private _revision: string 
    private _data: any
    private _isBrowser: boolean
    private _cache: Cache
    private _status: SESSION_STATUS
    private _config: any
    private _listeners: any
    private _dir: any
    private _server: Server
    private _dispatch: any
    private _handlers: any 

    constructor(config: any, dispatch: any = undefined) {
        this._config = config || {}
        this._dispatch = dispatch
        this._isBrowser = (typeof window !== 'undefined')
        this._cache = new Cache(this.isBrowser, this.config.root)
        this._data = { account: new Data(this, 'account') }
        this._status = SESSION_STATUS.NEW
        this._server = new Server(this)
        this._id = ""
        this._handlers = this.config.handlers || {}
        this._revision = this.config.revision || `N/A-${Date.now()}`
        this._listeners = []     
    
        Object.keys(this.config.data || {}).map(async (slice: string) => this._data[slice] = new Data(this, slice))
    }

    get dir () { 
        return this._dir
    }

    get handlers () {
        return this._handlers
    }

    get revision () {
        return this._revision
    }

    get listeners() {
        return this._listeners
    }

    get dispatch () {
        return this._dispatch
    }

    get config() { 
        return this._config
    }

    get id() {
        return this._id
    }

    get server () {
        return this._server
    }

    get status() {
        return this._status
    }

    get cache() {
        return this._cache
    }
    
    get data() {
        return this._data
    }

    get isBrowser() {
        return this._isBrowser
    }

    async save() {
        await this.cache.put(`session/id`, this.id)
        await Promise.all(Object.keys(this.data || {}).map(async (slice: string) => this.data[slice].save()))
    }

    async load() {
        this._id = await this.cache.get(`session/id`) || nanoid()
        await Promise.all(Object.keys(this.data || {}).map(async (slice: string) => this.data[slice].init()))
    }

    async init () {
        await this.load() 
        await this.save()
    }

    async close () {
        await this.cache.close()
    }

    listen(onEvent: any) {
        this.listeners.push(<IListener>{ onEvent })
    }

    onEvent(type: EVENT, data: any) {
        this.listeners.map((listener: IListener) => {
            listener.onEvent(type, nanoid(), data)
        })
    }

    setStatus(s: SESSION_STATUS) {
        LOG(`changed status [status=${s}]`)

        this._status = s
        this.onEvent(EVENT.STATUS_CHANGED, s)
    }

    get isReady() {
        return this.status >= SESSION_STATUS.READY
    }

    toJSON() {
        return ({
            id: this.id,
            cid: this.id
        })
    }

    async start(ipfs?: any) {
        LOG(`starting [revision=${this.revision}]`)
        this.setStatus(SESSION_STATUS.INITIALIZING)

        await this.init()
        await this.server.start(ipfs)
        await this.save()

        this.setStatus(SESSION_STATUS.READY)
    }

    async stop () {
        LOG(`stopping [revision=${this.revision}]`)
        this.setStatus(SESSION_STATUS.STOPPING)

        await this.close()
        await this.server.stop()

        this.setStatus(SESSION_STATUS.STOPPED)
    }
}