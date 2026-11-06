import {
  GetSettingsResponseSchema,
  SettingParamsSchema,
  UpsertSettingRequestSchema,
  UpsertSettingResponseSchema,
  createSuccessResponse,
  isUpdateSettingRequest,
} from '@st-hiring/shared';
import { UseCases } from '../../application/usecases';
import { createRoute } from '../create-route';

export const createSettingsRoutes = ({ getSettings, upsertSetting }: UseCases) => [
  createRoute({
    method: 'get',
    path: '/settings',
    response: GetSettingsResponseSchema,
    handler: async (_req, res) => {
      res.json(createSuccessResponse(await getSettings()));
    },
  }),
  createRoute({
    method: 'put',
    path: '/settings/:id',
    request: { params: SettingParamsSchema, body: UpsertSettingRequestSchema },
    response: UpsertSettingResponseSchema,
    handler: async (req, res) => {
      const setting = await upsertSetting({ id: req.params.id, ...req.body });

      if (isUpdateSettingRequest(req.body)) {
        res.json(createSuccessResponse(setting));
        return;
      }

      res
        .status(201)
        .location(`${req.baseUrl}/settings/${encodeURIComponent(setting.id)}`)
        .json(createSuccessResponse(setting));
    },
  }),
];
