import { Station } from '.'
import debug from 'debug'

let LOG = debug("carmel:channel")

export class Channel {

    public static PREFIX = "#carmel:channel"
    public static SYSTEM_ID = "sys"
    public static SYSTEM_MAIN_ID = "sys:main"
    public static SYSTEM_OPERATORS_ID = "sys:ops"
    public static ACCEPT_EVENT_ID = "req:accept"
    
    public static EVENT = {
        OPERATOR_ACCEPT: this.Id(this.SYSTEM_OPERATORS_ID, this.ACCEPT_EVENT_ID)
    } 

    private _id: string 
    private _station: Station 
    private _onEvent: any
    private _sendQueue: any
    private _isOpen: boolean
    private _config: any 
    private _events: any
    private _registerEvent: any

    constructor(id: string, config: any, station: Station) {
       this._id = id 
       LOG = debug(`carmel:channel:${id}`)
       this._isOpen = false
       this._station = station
       this._config = config || {}
       this._events = this.config.events || {}
       this._onEvent = this.onEvent.bind(this)
       this._registerEvent = this.registerEvent.bind(this)
       this._sendQueue = []
    }

    public static Id (id: string, event: string) {
        return `${this.PREFIX}:${id}:${event}`
    }

    get events () {
       return this._events
    }

    get config() {
        return this._config
    }

    get isOpen () {
        return this._isOpen
    }

    get id () {
        return this._id
    }

    get station () {
        return this._station
    }

    get sendQueue() {
        return this._sendQueue
    }

    async flush () {
        this._sendQueue = await this.station.session.cache.get("session/sendqueue") || []

        if (this.sendQueue.length === 0) return 

        LOG(`flushing send queue [events=${this.sendQueue.length}]`)

        await Promise.all(this.sendQueue.map((m: any) => this.sendEvent(m.id, m.data)))

        this._sendQueue = []
        await this.station.session.cache.put("session/sendqueue", [])

        LOG(`send queue completely flushed`)
    }

    async onEvent (id: string, data: any, station: Station) {
        const log = debug(`carmel:event:${this.id}:${id}`)
        log(`<- received [${id}] event`)

        if (!this.events || !this.events[id]) {
            log(`   [ skipped ] unrecognized event`)
            return 
        } 
        
        if (!this.station.session.functions || !this.station.session.functions[this.events[id]] ) {
            log(`   [ skipped ] no function associated with this event`)
            return 
        }

        const f: any = this.station.session.functions[this.events[id]]

        if (!f.handler || "function" !== typeof f.handler) {
            log(`   [ skipped ] invalid function`)
            return 
        }

        try {
           const result = await f.handler({ log, session: this.station.session, channel: this, id, data })
           log(`   success`, result)
        } catch (e: any) {
            log(`   Error:`, e)
        }
    }

    async queueEvent(e: any) {
        this._sendQueue = await this.station.session.cache.get("session/sendqueue") || []
        this.sendQueue.push(e)
        await this.station.session.cache.put("session/sendqueue", this.sendQueue)
    }        

    async sendEvent (id: string, data: any = {}) {
        if (!id || !this.events[id]) return 
        // this._sendRaw(e, props || {}, this.isOperator)

        if (!this.station.session.isConnected) {
            LOG(`-> delaying sending [${id}] event until connection is established`)
            await this.queueEvent({ id, data })
            return 
        }

        this.station.session.gateway.ipfs.pubsub.publish(`${Channel.PREFIX}:${this.id}:${id}`, JSON.stringify(data))
        LOG(`-> sent [${id}] event`)
    }

    async registerEvent (id: string) {
       if (!id || !this.events[id]) return 

       this.station.session.gateway.ipfs.pubsub.subscribe(`${Channel.PREFIX}:${this.id}:${id}`, (message: any) => {
            try {
                const { from, data } = message
                const e = data.toString()
                if (from === this.station.session.gateway.cid) return 
                
                this._onEvent(id, JSON.parse(e), this)
            } catch (err: any) {}
        })

       LOG(`registered [${id}] event`)
    }

    async open() {
        LOG(`opening channel ...`)
        
        await Promise.all(Object.keys(this.events).map(this._registerEvent)) 
        this._isOpen = true 

        LOG(`channel ready`)
    }

    async close() {
        LOG(`closing channel ...`)

        this._isOpen = false 
        
        LOG(`channel closed`)
    }
}