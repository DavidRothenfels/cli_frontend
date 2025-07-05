/// <reference path="../pb_data/types.d.ts" />

// Simple test API endpoint
routerAdd("GET", "/api/test", (c) => {
    return c.json(200, {
        message: "API is working!",
        timestamp: new Date().toISOString()
    })
})

// Simple test POST endpoint
routerAdd("POST", "/api/test-post", (c) => {
    try {
        const info = $apis.requestInfo(c)
        return c.json(200, {
            message: "POST endpoint working",
            received: info.data || {},
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        return c.json(500, {
            error: "Error: " + error.message
        })
    }
})