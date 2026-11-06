import {
  GetSettingsEndpoint,
  UpsertSettingEndpoint,
  createSuccessResponse,
  isUpdateSettingRequest,
} from '@st-hiring/shared';
import { UseCases } from '../../application/usecases';
import { createRoute } from '../create-route';

export const createSettingsRoutes = ({ getSettings, upsertSetting }: UseCases) => [
  createRoute(GetSettingsEndpoint, async (_req, res) => {
    res.json(createSuccessResponse(await getSettings()));
  }),

  createRoute(UpsertSettingEndpoint, async (req, res) => {
    const setting = await upsertSetting({ id: req.params.id, ...req.body });

    if (isUpdateSettingRequest(req.body)) {
      res.json(createSuccessResponse(setting));
      return;
    }

    res
      .status(201)
      .location(`/v1/settings/${encodeURIComponent(setting.id)}`)
      .json(createSuccessResponse(setting));
  }),
];
