/*
 * Copyright 2022 Objectiv B.V.
 */

import { LocationStack } from './Context';
import {
  LocationContextValidationRuleFactory,
  MissingGlobalContextValidationRuleFactory,
  UniqueGlobalContextValidationRuleFactory,
} from './ContextValidationRules';
import { EventRecorderInterface } from './EventRecorderInterface';
import { LocationTreeInterface } from './LocationTreeInterface';
import { TrackerConsoleInterface } from './TrackerConsoleInterface';
import { TrackerPluginInterface } from './TrackerPluginInterface';

/**
 * DeveloperTools interface definition.
 */
export interface TrackerDeveloperToolsInterface {
  EventRecorder: EventRecorderInterface;
  getLocationPath: (locationStack: LocationStack) => string;
  LocationTree: LocationTreeInterface;
  makeLocationContextValidationRule: LocationContextValidationRuleFactory;
  makeMissingGlobalContextValidationRule: MissingGlobalContextValidationRuleFactory;
  makeUniqueGlobalContextValidationRule: UniqueGlobalContextValidationRuleFactory;
  OpenTaxonomyValidationPlugin: TrackerPluginInterface;
  TrackerConsole: TrackerConsoleInterface;
}
