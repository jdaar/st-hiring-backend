import { Knex } from 'knex';
import { Event, EventsRepository, TICKET_STATUSES, TicketTypeSummary } from '@st-hiring/shared';
import { TicketStatus } from '@st-hiring/shared';

interface EventRow {
  id: number;
  name: string;
  date: Date;
  location: string;
  description: string;
  created_at: Date;
  updated_at: Date;
}

interface EventWithTicketTypesRow extends EventRow {
  ticket_types: TicketTypeSummary[];
}

const toEvent = (row: EventWithTicketTypesRow): Event => ({
  id: row.id,
  name: row.name,
  date: row.date,
  location: row.location,
  description: row.description,
  ticketTypes: row.ticket_types,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// json_build_object('available', count(*) filter (where status = 'available'), ...) for every ticket status
const statusCounts = (knex: Knex) =>
  knex.raw(
    `json_build_object(${TICKET_STATUSES.map(() => '?::text, count(*) filter (where ticket.status = ?)::int').join(', ')})`,
    TICKET_STATUSES.flatMap((status: TicketStatus) => [status, status]),
  );

export const createEventsRepository = (knex: Knex): EventsRepository => ({
  async getPaginatedEvents(page: number, pageSize: number) {
    const eventsPage = knex('events')
      .select('*')
      .orderBy([{ column: 'date' }, { column: 'id' }])
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .as('event');

    // one row per ticket type of the outer event, already shaped as a TicketTypeSummary
    const ticketTypeSummaries = knex('tickets as ticket')
      .select(
        'ticket.type',
        knex.raw(
          `json_build_object(
            'type', ticket.type,
            'faceValuePrice', max(ticket.face_value_price)::text,
            'serviceFeePrice', max(ticket.service_fee_price)::text,
            'statusCounts', ?
          ) as summary`,
          [statusCounts(knex)],
        ),
      )
      .where('ticket.event_id', knex.ref('event.id'))
      .groupBy('ticket.type')
      .as('ticket_type');

    const ticketTypes = knex
      .from(ticketTypeSummaries)
      .select(knex.raw(`coalesce(json_agg(ticket_type.summary order by ticket_type.type), '[]'::json)`))
      .as('ticket_types');

    const [rows, countRow] = await Promise.all([
      knex
        .from(eventsPage)
        .select<EventWithTicketTypesRow[]>('event.*', ticketTypes)
        .orderBy([{ column: 'event.date' }, { column: 'event.id' }]),
      knex('events').count<{ count: string }>({ count: '*' }).first(),
    ]);

    return { events: rows.map(toEvent), total: Number(countRow?.count ?? 0) };
  },
});
