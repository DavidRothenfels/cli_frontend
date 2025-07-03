/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "403nz0k49prrkc1",
    "created": "2025-07-03 03:44:01.948Z",
    "updated": "2025-07-03 03:44:01.948Z",
    "name": "generation_requests",
    "type": "base",
    "system": false,
    "schema": [],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("403nz0k49prrkc1");

  return dao.deleteCollection(collection);
})
