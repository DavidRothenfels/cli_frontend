/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "mejrohnysoo625k",
    "created": "2025-07-03 03:44:01.934Z",
    "updated": "2025-07-03 03:44:01.934Z",
    "name": "documents",
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
  const collection = dao.findCollectionByNameOrId("mejrohnysoo625k");

  return dao.deleteCollection(collection);
})
