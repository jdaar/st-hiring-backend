import { Knex } from 'knex';
import { describe, expect, it, vi } from 'vitest';
import { createEventsRepository } from './events.dal';

const BUILDER_METHODS = ['select', 'orderBy', 'limit', 'offset', 'as', 'where', 'groupBy', 'count', 'first'] as const;

type Builder = Record<(typeof BUILDER_METHODS)[number], ReturnType<typeof vi.fn>> & { then?: Promise<unknown>['then'] };

const builder = (): Builder => {
  const query = {} as Builder;
  for (const method of BUILDER_METHODS) query[method] = vi.fn(() => query);
  return query;
};

const awaitable = (result: unknown): Builder => {
  const query = builder();
  query.then = (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected);
  return query;
};

const createKnex = ({ rows = [] as unknown[], countRow }: { rows?: unknown[]; countRow?: { count: string } }) => {
  const queries = {
    eventsPage: builder(),
    ticketTypeSummaries: builder(),
    count: awaitable(countRow),
    ticketTypes: builder(),
    rows: awaitable(rows),
  };
  const knex = Object.assign(
    vi
      .fn()
      .mockReturnValueOnce(queries.eventsPage)
      .mockReturnValueOnce(queries.ticketTypeSummaries)
      .mockReturnValueOnce(queries.count),
    {
      from: vi.fn().mockReturnValueOnce(queries.ticketTypes).mockReturnValueOnce(queries.rows),
      raw: vi.fn((sql: string, bindings?: unknown[]) => ({ sql, bindings })),
      ref: vi.fn((column: string) => ({ ref: column })),
    },
  );
  return { knex, queries };
};

const row = {
  id: 7,
  name: 'Concert',
  date: new Date('2026-12-01'),
  location: 'Bogota',
  description: 'Live',
  ticket_types: [{ type: 'vip' }],
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-02'),
};

describe('eventsRepository.getPaginatedEvents', () => {
  it('selects the requested page of events ordered by date and id', async () => {
    // Arrange
    const { knex, queries } = createKnex({ countRow: { count: '0' } });

    // Act
    await createEventsRepository(knex as unknown as Knex).getPaginatedEvents(3, 10);

    // Assert
    expect(knex).toHaveBeenNthCalledWith(1, 'events');
    expect(queries.eventsPage.orderBy).toHaveBeenCalledWith([{ column: 'date' }, { column: 'id' }]);
    expect(queries.eventsPage.limit).toHaveBeenCalledWith(10);
    expect(queries.eventsPage.offset).toHaveBeenCalledWith(20);
    expect(queries.eventsPage.as).toHaveBeenCalledWith('event');
    expect(knex.from).toHaveBeenNthCalledWith(2, queries.eventsPage);
    expect(queries.rows.select).toHaveBeenCalledWith('event.*', queries.ticketTypes);
    expect(queries.rows.orderBy).toHaveBeenCalledWith([{ column: 'event.date' }, { column: 'event.id' }]);
  });

  it('summarises the ticket types of each event with a count per ticket status', async () => {
    // Arrange
    const { knex, queries } = createKnex({ countRow: { count: '0' } });

    // Act
    await createEventsRepository(knex as unknown as Knex).getPaginatedEvents(1, 10);

    // Assert
    const statusCounts = knex.raw.mock.results[0].value;
    expect(statusCounts).toEqual({
      sql: `json_build_object(${Array(3).fill('?::text, count(*) filter (where ticket.status = ?)::int').join(', ')})`,
      bindings: ['available', 'available', 'sold', 'sold', 'reserved', 'reserved'],
    });
    expect(knex).toHaveBeenNthCalledWith(2, 'tickets as ticket');
    expect(queries.ticketTypeSummaries.select).toHaveBeenCalledWith('ticket.type', knex.raw.mock.results[1].value);
    expect(knex.raw.mock.calls[1][1]).toEqual([statusCounts]);
    expect(queries.ticketTypeSummaries.where).toHaveBeenCalledWith('ticket.event_id', { ref: 'event.id' });
    expect(queries.ticketTypeSummaries.groupBy).toHaveBeenCalledWith('ticket.type');
    expect(knex.from).toHaveBeenNthCalledWith(1, queries.ticketTypeSummaries);
    expect(queries.ticketTypes.select).toHaveBeenCalledWith(knex.raw.mock.results[2].value);
    expect(queries.ticketTypes.as).toHaveBeenCalledWith('ticket_types');
  });

  it('maps the rows to events and returns the total', async () => {
    // Arrange
    const { knex, queries } = createKnex({ rows: [row], countRow: { count: '21' } });

    // Act
    const result = await createEventsRepository(knex as unknown as Knex).getPaginatedEvents(1, 10);

    // Assert
    expect(knex).toHaveBeenNthCalledWith(3, 'events');
    expect(queries.count.count).toHaveBeenCalledWith({ count: '*' });
    expect(result).toEqual({
      events: [
        {
          id: 7,
          name: 'Concert',
          date: row.date,
          location: 'Bogota',
          description: 'Live',
          ticketTypes: [{ type: 'vip' }],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      ],
      total: 21,
    });
  });

  it('returns a total of zero when the count row is missing', async () => {
    // Arrange
    const { knex } = createKnex({});

    // Act
    const result = await createEventsRepository(knex as unknown as Knex).getPaginatedEvents(1, 10);

    // Assert
    expect(result).toEqual({ events: [], total: 0 });
  });
});
