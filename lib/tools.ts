/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FunctionResponseScheduling } from '@google/genai';
import { FunctionCall } from './state';

export const virtualProductionTools: FunctionCall[] = [
  {
    name: 'set_camera_zoom',
    description: 'Sets the camera zoom level. The value should be between 1 (no zoom) and 5 (maximum zoom).',
    parameters: {
      type: 'OBJECT',
      properties: {
        level: {
          type: 'NUMBER',
          description: 'The desired zoom level, from 1 to 5.',
        },
      },
      required: ['level'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
  {
    name: 'set_light_type',
    description: 'Sets the color temperature of the scene lighting.',
    parameters: {
      type: 'OBJECT',
      properties: {
        type: {
          type: 'STRING',
          description: 'The type of light to apply. Available options are: none, warm, cool, daylight.',
        },
      },
      required: ['type'],
    },
    isEnabled: true,
    scheduling: FunctionResponseScheduling.INTERRUPT,
  },
];
