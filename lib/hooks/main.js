"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCarmel = void 0;
const react_1 = require("react");
const debug_1 = __importDefault(require("debug"));
const LOG = (0, debug_1.default)('carmel:hooks');
const useCarmel = (config, dispatch = undefined) => {
    const [session, setSession] = (0, react_1.useState)();
    const [loggedIn, setLoggedIn] = (0, react_1.useState)(false);
    const [ready, setReady] = (0, react_1.useState)(false);
    const [events, setEvents] = (0, react_1.useState)([]);
    const [newEvent, setNewEvent] = (0, react_1.useState)();
    // const onNewEvent = (e: any) => {
    //     switch(e.type) {
    //       case EVENT.CONNECTED:
    //         return
    //       case EVENT.DATA_CHANGED:
    //         // setData({ _timestamp: Date.now(), ...session.data })
    //         return
    //       default:
    //     }
    //     setNewEvent(e)
    // }
    const init = async () => {
        // session.listen((type: EVENT, id: string, data: any) => {
        //   if (events.length === 0 || events[events.length - 1].id !== id) {
        //     onNewEvent({ type, id, data })
        //   }
        //   events.push({ type, id, data })
        // })
        // await session.start()
    };
    (0, react_1.useEffect)(() => {
        // setSession(new Session(config, dispatch))
    }, []);
    (0, react_1.useEffect)(() => {
        (async () => {
            // if (!session) return 
            // await init()
            // setReady(true)
        })();
    }, [session]);
    return {
        session,
        events,
        ready,
        newEvent,
        loggedIn,
        // EVENT, 
        // SESSION_STATUS
    };
};
exports.useCarmel = useCarmel;
//# sourceMappingURL=main.js.map