/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('tickets', (table) => {
    table.decimal('face_value_price', 19, 4);
    table.decimal('service_fee_price', 19, 4).notNullable().defaultTo(0);
  });
  await knex('tickets').update({ face_value_price: knex.raw('price / 100.0') });
  await knex.schema.alterTable('tickets', (table) => {
    table.dropNullable('face_value_price');
    table.dropColumn('price');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('tickets', (table) => {
    table.integer('price');
  });
  await knex('tickets').update({ price: knex.raw('round(face_value_price * 100)::integer') });
  await knex.schema.alterTable('tickets', (table) => {
    table.dropNullable('price');
    table.dropColumn('face_value_price');
    table.dropColumn('service_fee_price');
  });
};
