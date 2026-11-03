// Background polling never renews these deadlines. Only explicit user activity does.
export const SESSION_LOCK_MS=60*60*1000;
export const SESSION_IDLE_MS=5*60*60*1000;
