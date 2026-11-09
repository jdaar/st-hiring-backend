/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('tickets', (table) => {
    table.index(['event_id', 'type', 'status']);
  });
  await knex.schema.alterTable('events', (table) => {
    table.index(['date', 'id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('tickets', (table) => {
    table.dropIndex(['event_id', 'type', 'status']);
  });
  await knex.schema.alterTable('events', (table) => {
    table.dropIndex(['date', 'id']);
  });
};
