/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`CREATE TYPE ticket_status AS ENUM ('available', 'sold', 'reserved')`);
  await knex.raw('ALTER TABLE tickets ALTER COLUMN status TYPE ticket_status USING status::ticket_status');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw('ALTER TABLE tickets ALTER COLUMN status TYPE varchar(255) USING status::text');
  await knex.raw('DROP TYPE ticket_status');
};
