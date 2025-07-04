/**
 * Simple document download endpoint
 */

routerAdd("GET", "/api/download-document/:documentId", (c) => {
    const documentId = c.pathParam("documentId")
    
    try {
        const document = $app.dao().findRecordById("documents", documentId)
        if (!document) {
            return c.json(404, { error: "Document not found" })
        }

        const content = document.getString("content")
        const filename = `${document.getString("title")}.md`

        c.response().header().set("Content-Type", "text/markdown")
        c.response().header().set("Content-Disposition", `attachment; filename="${filename}"`)
        
        return c.string(200, content)

    } catch (error) {
        console.error("Download error:", error)
        return c.json(500, { error: "Download failed" })
    }
})