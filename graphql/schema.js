const { buildSchema } = require("graphql");
const { importSchema } = require("graphql-import");

module.exports = buildSchema(importSchema('*/schema.graphql'));