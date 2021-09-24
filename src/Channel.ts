import { Station } from '.'
import debug from 'debug'

const LOG = debug("carmel:channel")

export class Channel {

    public static PREFIX = "#carmel:channel"
    public static SYSTEM_ID = "sys"
    public static SYSTEM_MAIN_ID = "sys:main"
    public static SYSTEM_OPERATORS_ID = "sys:ops"

    public static EVENT_RESPONSE_ID = "res"
    public static EVENT_REQUEST_ID = "req"
    public static EVENT_MAIN_ID = "main"
    
    public static SYSTEM = {
        MAIN: this.Id(this.SYSTEM_MAIN_ID),
        OPERATORS: this.Id(this.SYSTEM_OPERATORS_ID)
    } 

    private _id: string 
    private _station: Station 
    private _listen: any
    private _onEvent: any
    private _send: any
    private _sendQueue: any

    constructor(id: string, station: Station) {
       this._id = id 
       this._station = station
       this._listen = this.listen.bind(this)
       this._onEvent = this.onEvent.bind(this)
       this._send = { _: this._sendRaw.bind(this) }
       this._sendQueue = []
    }

    public static Id (id: string) {
        return `${this.PREFIX}:${id}`
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

    get send () {
        return this._send
    }

    get defaultEvents () {
        return [Channel.EVENT_MAIN_ID]
    }

    get initialEvents () {
        // TODO add event configuration and filtering
        return ([])
    }

    async _sendRaw (type: string, event: any, isResponse: boolean = false) {
        if (!this.station.session.gateway.ipfs) return

        const fullType = `${isResponse ? 'res': 'req'}:${type}`.toLowerCase()

        if (!this.station.session.isConnected) {
            LOG(`-> delaying event until connection is established [${fullType}]`)
            await this.addToSendQueue({ type, event, isResponse })
            return 
        }

        this.station.session.gateway.ipfs.pubsub.publish(`#carmel:events:${fullType}`, JSON.stringify(event || {}))

        LOG(`-> sent [${type.toLowerCase()}] ${isResponse ? 'response' : 'request'}`)
    }

    async flush () {
        this._sendQueue = await this.station.session.cache.get("session/sendqueue") || []

        if (this.sendQueue.length === 0) return 

        LOG(`flushing send queue [events=${this.sendQueue.length}]`)

        await Promise.all(this.sendQueue.map((m: any) => this.send._(m.type, m.event, m.isResponse)))

        this._sendQueue = []
        await this.station.session.cache.put("session/sendqueue", [])

        LOG(`send queue completely flushed`)
    }

    async addToSendQueue(e: any) {
        this._sendQueue = await this.station.session.cache.get("session/sendqueue") || []
        this.sendQueue.push(e)
        await this.station.session.cache.put("session/sendqueue", this.sendQueue)
    }        

    async onEvent (id: string, event: any, station: Station, isResponse: boolean = false) {
        LOG(`<- received [${id}] ${isResponse ? 'response' : 'request'}`)

        // const handler: any = session.handlers[`${type.toLowerCase()}` as keyof typeof session.handlers]
        
        // if (!handler) {
        //     LOG(`   [ skipped ] could not find event handler`)
        //     return 
        // } 

        // // Handle it
        // const result = await handler.request({ session, event, eventlog })

        // // Send the result back
        // this.send[type.toLowerCase()](result)
    }

    async listen(id: string, isResponse: boolean = false) {
        LOG(`listening for [${id}] ${isResponse ? 'responses' : 'requests'}`)
        // this._send[e.toLowerCase()] = async (props: any) => this._sendRaw(e, props || {}, this.isOperator)

        this.station.session.gateway.ipfs.pubsub.subscribe(`${Channel.PREFIX}:${this.id}:${isResponse ? Channel.EVENT_RESPONSE_ID : Channel.EVENT_REQUEST_ID}:${id}`, (message: any) => {
            try {
                const { from, data } = message
                const e = data.toString()
                if (from === this.station.session.gateway.cid) return 
                
                this._onEvent(id, JSON.parse(e), this, isResponse)
            } catch (err: any) {}
        })
    }

    // async addEventHandler (handler: any) {
        
        // // Operators send responses and non-operators send requests
        // this._send[e.toLowerCase()] = async (props: any) => this._sendRaw(e, props || {}, this.isOperator)


        // this._
        // // Operators listen for event requests
        // this.isOperator && this._listen(e)

        // // Non-operators listen for event responses
        // this.isOperator || this._listen(e, true)
    // }

    async open() {
        LOG(`opening channel [id=${this.id}] ...`)

        await Promise.all(this.defaultEvents.concat(this.initialEvents).map((id: string) => this.listen(id))) 

        LOG(`channel ready [id=${this.id}]`)
    }

    async close() {
        LOG(`closing channel [id=${this.id}] ...`)

        LOG(`channel closed [id=${this.id}]`)
    }
}