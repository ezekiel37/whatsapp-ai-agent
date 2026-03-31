// rateLimiter.js

class RateLimiter {
    constructor(limit, interval) {
        this.limit = limit;
        this.interval = interval;
        this.requests = 0;
        this.startTime = Date.now();
    }

    isLimitExceeded() {
        const now = Date.now();
        // Reset requests count if the time interval has passed
        if (now - this.startTime > this.interval) {
            this.requests = 0;
            this.startTime = now;
        }
        return this.requests >= this.limit;
    }

    request() {
        if (this.isLimitExceeded()) {
            throw new Error('Rate limit exceeded');
        }
        this.requests++;
        // Proceed with the request
    }
}

module.exports = RateLimiter;