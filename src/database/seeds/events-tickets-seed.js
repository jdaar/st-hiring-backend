const { faker } = require('@faker-js/faker');

const EVENTS = 100;
const TICKETS_PER_EVENT = 500;
// cheapest tier first
const TICKET_TYPES = ['Early Bird', 'General', 'Balcony', 'Front Row', 'VIP', 'Backstage'];

// picsum serves a stable random image per seed, at most 512x512
const mockImage = () => {
  const width = faker.number.int({ min: 256, max: 512 });
  const height = faker.number.int({ min: 256, max: 512 });
  return `![${faker.lorem.words(3)}](https://picsum.photos/seed/${faker.string.alphanumeric(8)}/${width}/${height})`;
};

const markdownDescription = () =>
  [
    `## ${faker.lorem.sentence({ min: 3, max: 6 })}`,
    `${faker.lorem.sentence()} **${faker.lorem.words(2)}** ${faker.lorem.sentence()} *${faker.lorem.words(3)}*.`,
    faker.helpers
      .multiple(() => `- ${faker.lorem.sentence({ min: 3, max: 8 })}`, { count: { min: 2, max: 4 } })
      .join('\n'),
    mockImage(),
  ].join('\n\n');

exports.seed = async function (knex) {
  await knex.raw('TRUNCATE tickets, events RESTART IDENTITY CASCADE');

  const events = await knex('events')
    .insert(
      faker.helpers.multiple(
        () => ({
          name: faker.lorem.words(),
          description: markdownDescription(),
          date: faker.date.future(),
          location: faker.location.city(),
        }),
        { count: EVENTS },
      ),
    )
    .returning('id');

  // the api reports one price per event and ticket type, so every ticket of a type shares it;
  // each event sells a random subset of types, pricier the higher the tier, splitting its allotment at random
  const tickets = events.flatMap(({ id }) => {
    const types = TICKET_TYPES.filter((type) => type === 'General' || faker.datatype.boolean());
    const prices = types.map(() => faker.number.float({ min: 0, max: 100, multipleOf: 0.01 })).sort((a, b) => a - b);
    const cuts = faker.helpers
      .uniqueArray(() => faker.number.int({ min: 1, max: TICKETS_PER_EVENT - 1 }), types.length - 1)
      .sort((a, b) => a - b);
    const bounds = [0, ...cuts, TICKETS_PER_EVENT];

    return types.flatMap((type, i) =>
      Array.from({ length: bounds[i + 1] - bounds[i] }, () => ({
        event_id: id,
        status: faker.helpers.arrayElement(['available', 'sold', 'reserved']),
        type,
        face_value_price: prices[i],
        service_fee_price: Math.round(prices[i] * 15) / 100,
      })),
    );
  });
  await knex.batchInsert('tickets', tickets, 1000);
};
