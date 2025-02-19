/**
 * HTTP Success Status Codes (2xx)
 * Used to indicate successful completion of client requests
 * @enum {number}
 */
export enum SUCCESS_CODES {
    /** Request succeeded and response includes result */
    OK = 200,
    
    /** Request succeeded and new resource was created */
    CREATED = 201,
    
    /** Request accepted for processing but not yet completed */
    ACCEPTED = 202,
    
    /** Request succeeded but response has no content */
    NO_CONTENT = 204
}

/**
 * HTTP Redirect Status Codes (3xx)
 * Used to indicate URL redirections and resource relocations
 * @enum {number}
 */
export enum REDIRECT_CODES {
    /** Resource permanently moved to new URL */
    MOVED_PERMANENTLY = 301,
    
    /** Resource temporarily moved to new URL */
    FOUND = 302,
    
    /** Response to request can be found at new URL */
    SEE_OTHER = 303,
    
    /** Resource temporarily moved but keep original method */
    TEMPORARY_REDIRECT = 307
}

/**
 * HTTP Client Error Status Codes (4xx)
 * Used to indicate client-side errors and validation failures
 * @enum {number}
 */
export enum CLIENT_ERROR_CODES {
    /** Request has invalid syntax or parameters */
    BAD_REQUEST = 400,
    
    /** Request requires valid authentication */
    UNAUTHORIZED = 401,
    
    /** Server understood request but refuses to authorize it */
    FORBIDDEN = 403,
    
    /** Requested resource not found */
    NOT_FOUND = 404,
    
    /** HTTP method not allowed for requested resource */
    METHOD_NOT_ALLOWED = 405,
    
    /** Request conflicts with current state of server */
    CONFLICT = 409,
    
    /** Request semantically incorrect or invalid */
    UNPROCESSABLE_ENTITY = 422,
    
    /** Too many requests in given time period */
    TOO_MANY_REQUESTS = 429
}

/**
 * HTTP Server Error Status Codes (5xx)
 * Used to indicate server-side errors and service availability issues
 * @enum {number}
 */
export enum SERVER_ERROR_CODES {
    /** Unexpected server error occurred */
    INTERNAL_SERVER_ERROR = 500,
    
    /** Server does not support functionality required */
    NOT_IMPLEMENTED = 501,
    
    /** Invalid response received from upstream server */
    BAD_GATEWAY = 502,
    
    /** Server temporarily unavailable or overloaded */
    SERVICE_UNAVAILABLE = 503,
    
    /** Upstream server failed to respond in time */
    GATEWAY_TIMEOUT = 504
}