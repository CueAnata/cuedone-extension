/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import './browser-panel.css';
import { TaskPanelSystem } from './task-panel.js';
import { SpatialPresentationSystem } from './spatial-presentation.js';
import { installHandsOnlyInput, useEmulatedHands } from './hands-only-input.js';
import { HandsOnlySystem } from './hands-only-system.js';

if(import.meta.env.DEV) {
  useEmulatedHands((window as unknown as {IWER_DEVICE?: Parameters<typeof useEmulatedHands>[0]}).IWER_DEVICE);
}

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.addCleanup(installHandsOnlyInput(world.input.xr));
  world.registerSystem(TaskPanelSystem);
  world.registerSystem(SpatialPresentationSystem);
  world.registerSystem(HandsOnlySystem);
});
