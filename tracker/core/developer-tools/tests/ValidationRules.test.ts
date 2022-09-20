/*
 * Copyright 2022 Objectiv B.V.
 */

import { MockConsoleImplementation } from '@objectiv/testing-tools';
import {
  generateGUID,
  GlobalContextName,
  LocationContextName,
  TrackerEvent,
  TrackerPlatform,
} from '@objectiv/tracker-core';
import { TrackerConsole } from '../src/TrackerConsole';
import { makeLocationContextValidationRule } from '../src/validationRules/makeLocationContextValidationRule';
import { makeMissingGlobalContextValidationRule } from '../src/validationRules/makeMissingGlobalContextValidationRule';
import { makeUniqueGlobalContextValidationRule } from '../src/validationRules/makeUniqueGlobalContextValidationRule';

TrackerConsole.setImplementation(MockConsoleImplementation);

describe('Validation Rules', () => {
  describe('MissingGlobalContextValidationRules', () => {
    it('Should skip validation if the given `eventMatches` returns false', () => {
      const testGlobalContextValidationRule = makeMissingGlobalContextValidationRule({
        platform: TrackerPlatform.CORE,
        contextName: GlobalContextName.PathContext,
        eventMatches: () => false,
      });

      jest.resetAllMocks();

      testGlobalContextValidationRule.validate(
        new TrackerEvent({ _type: 'PressEvent', id: generateGUID(), time: Date.now() })
      );

      expect(MockConsoleImplementation.groupCollapsed).not.toHaveBeenCalled();
    });

    it('Should TrackerConsole.error if given contextName is missing', () => {
      const testGlobalContextValidationRule = makeMissingGlobalContextValidationRule({
        platform: TrackerPlatform.CORE,
        contextName: GlobalContextName.PathContext,
      });

      jest.resetAllMocks();

      testGlobalContextValidationRule.validate(
        new TrackerEvent({ _type: 'PressEvent', id: generateGUID(), time: Date.now() })
      );

      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledTimes(1);
      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledWith(
        '%c｢objectiv｣ Error: PathContext is missing from Global Contexts of PressEvent.\n' +
          'Taxonomy documentation: https://objectiv.io/docs/taxonomy/reference/global-contexts/PathContext.',
        'color:red'
      );
    });

    it('Should prefix TrackerConsole.error messages with logPrefix', () => {
      const testGlobalContextValidationRule = makeMissingGlobalContextValidationRule({
        platform: TrackerPlatform.CORE,
        contextName: GlobalContextName.PathContext,
        logPrefix: 'TestPrefix',
      });

      jest.resetAllMocks();

      testGlobalContextValidationRule.validate(
        new TrackerEvent({ _type: 'PressEvent', id: generateGUID(), time: Date.now() })
      );

      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledTimes(1);
      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledWith(
        '%c｢objectiv:TestPrefix｣ Error: PathContext is missing from Global Contexts of PressEvent.\n' +
          'Taxonomy documentation: https://objectiv.io/docs/taxonomy/reference/global-contexts/PathContext.',
        'color:red'
      );
    });
  });

  describe('UniqueGlobalContextValidationRules', () => {
    it('Should skip validation if the given `eventMatches` returns false', () => {
      const testGlobalContextValidationRule = makeUniqueGlobalContextValidationRule({
        platform: TrackerPlatform.CORE,
        eventMatches: () => false,
      });

      jest.resetAllMocks();

      testGlobalContextValidationRule.validate(
        new TrackerEvent({ _type: 'PressEvent', id: generateGUID(), time: Date.now() })
      );

      expect(MockConsoleImplementation.groupCollapsed).not.toHaveBeenCalled();
    });

    it('Should prefix TrackerConsole.error messages with logPrefix', () => {
      const testGlobalContextValidationRule = makeUniqueGlobalContextValidationRule({
        platform: TrackerPlatform.CORE,
        logPrefix: 'TestPrefix',
      });

      jest.resetAllMocks();

      testGlobalContextValidationRule.validate(
        new TrackerEvent({
          _type: 'PressEvent',
          global_contexts: [
            { __instance_id: generateGUID(), __global_context: true, _type: GlobalContextName.PathContext, id: 'test' },
            { __instance_id: generateGUID(), __global_context: true, _type: GlobalContextName.PathContext, id: 'test' },
          ],
          id: generateGUID(),
          time: Date.now(),
        })
      );

      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledTimes(1);
      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledWith(
        '%c｢objectiv:TestPrefix｣ Error: Only one PathContext(id: test) should be present in Global Contexts of PressEvent.\n' +
          'Taxonomy documentation: https://objectiv.io/docs/taxonomy/reference/global-contexts/PathContext.',
        'color:red'
      );
    });

    it('Should TrackerConsole.error if any global context is present more than once', () => {
      const testGlobalContextValidationRule = makeUniqueGlobalContextValidationRule({
        platform: TrackerPlatform.CORE,
      });

      jest.resetAllMocks();

      testGlobalContextValidationRule.validate(
        new TrackerEvent({
          _type: 'PressEvent',
          global_contexts: [
            {
              __instance_id: generateGUID(),
              __global_context: true,
              _type: GlobalContextName.InputValueContext,
              id: 'test',
            },
            {
              __instance_id: generateGUID(),
              __global_context: true,
              _type: GlobalContextName.InputValueContext,
              id: 'test',
            },
            { __instance_id: generateGUID(), __global_context: true, _type: GlobalContextName.PathContext, id: 'test' },
            { __instance_id: generateGUID(), __global_context: true, _type: GlobalContextName.PathContext, id: 'test' },
          ],
          id: generateGUID(),
          time: Date.now(),
        })
      );

      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledTimes(2);
      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledWith(
        '%c｢objectiv｣ Error: Only one PathContext(id: test) should be present in Global Contexts of PressEvent.\n' +
          'Taxonomy documentation: https://objectiv.io/docs/taxonomy/reference/global-contexts/PathContext.',
        'color:red'
      );
      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledWith(
        '%c｢objectiv｣ Error: Only one InputValueContext(id: test) should be present in Global Contexts of PressEvent.\n' +
          'Taxonomy documentation: https://objectiv.io/docs/taxonomy/reference/global-contexts/InputValueContext.',
        'color:red'
      );
    });
  });

  describe('LocationContextValidationRules', () => {
    it('Should skip validation if the given `eventMatches` returns false', () => {
      const testLocationContextValidationRule = makeLocationContextValidationRule({
        platform: TrackerPlatform.CORE,
        contextName: LocationContextName.ContentContext,
        eventMatches: () => false,
      });

      jest.resetAllMocks();

      testLocationContextValidationRule.validate(
        new TrackerEvent({ _type: 'PressEvent', id: generateGUID(), time: Date.now() })
      );

      expect(MockConsoleImplementation.groupCollapsed).not.toHaveBeenCalled();
    });

    it('Should TrackerConsole.error if given contextName is missing', () => {
      const testLocationContextValidationRule = makeLocationContextValidationRule({
        platform: TrackerPlatform.CORE,
        contextName: LocationContextName.ContentContext,
      });

      jest.resetAllMocks();

      testLocationContextValidationRule.validate(
        new TrackerEvent({ _type: 'PressEvent', id: generateGUID(), time: Date.now() })
      );

      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledTimes(1);
      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledWith(
        '%c｢objectiv｣ Error: ContentContext is missing from Location Stack of PressEvent.\n' +
          'Taxonomy documentation: https://objectiv.io/docs/taxonomy/reference/location-contexts/ContentContext.',
        'color:red'
      );
    });

    it('Should prefix TrackerConsole.error messages with logPrefix', () => {
      const testLocationContextValidationRule = makeLocationContextValidationRule({
        platform: TrackerPlatform.CORE,
        contextName: LocationContextName.ContentContext,
        logPrefix: 'TestPrefix',
      });

      jest.resetAllMocks();

      testLocationContextValidationRule.validate(
        new TrackerEvent({ _type: 'PressEvent', id: generateGUID(), time: Date.now() })
      );

      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledTimes(1);
      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledWith(
        '%c｢objectiv:TestPrefix｣ Error: ContentContext is missing from Location Stack of PressEvent.\n' +
          'Taxonomy documentation: https://objectiv.io/docs/taxonomy/reference/location-contexts/ContentContext.',
        'color:red'
      );
    });

    it('Should TrackerConsole.error if given contextName is present more than once', () => {
      const testLocationContextValidationRule = makeLocationContextValidationRule({
        platform: TrackerPlatform.CORE,
        contextName: LocationContextName.ContentContext,
        once: true,
      });

      jest.resetAllMocks();

      testLocationContextValidationRule.validate(
        new TrackerEvent({
          _type: 'PressEvent',
          location_stack: [
            {
              __instance_id: generateGUID(),
              __location_context: true,
              _type: LocationContextName.ContentContext,
              id: 'test',
            },
            {
              __instance_id: generateGUID(),
              __location_context: true,
              _type: LocationContextName.ContentContext,
              id: 'test',
            },
          ],
          id: generateGUID(),
          time: Date.now(),
        })
      );

      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledTimes(1);
      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledWith(
        '%c｢objectiv｣ Error: Only one ContentContext should be present in Location Stack of PressEvent.\n' +
          'Taxonomy documentation: https://objectiv.io/docs/taxonomy/reference/location-contexts/ContentContext.',
        'color:red'
      );
    });

    it('Should TrackerConsole.error if given contextName is present in the wrong position', () => {
      const testLocationContextValidationRule = makeLocationContextValidationRule({
        platform: TrackerPlatform.CORE,
        contextName: LocationContextName.ContentContext,
        once: true,
        position: 0,
      });

      jest.resetAllMocks();

      testLocationContextValidationRule.validate(
        new TrackerEvent({
          _type: 'PressEvent',
          location_stack: [
            {
              __instance_id: generateGUID(),
              __location_context: true,
              _type: LocationContextName.RootLocationContext,
              id: 'test',
            },
            {
              __instance_id: generateGUID(),
              __location_context: true,
              _type: LocationContextName.ContentContext,
              id: 'test',
            },
          ],
          id: generateGUID(),
          time: Date.now(),
        })
      );

      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledTimes(1);
      expect(MockConsoleImplementation.groupCollapsed).toHaveBeenCalledWith(
        '%c｢objectiv｣ Error: ContentContext is in the wrong position of the Location Stack of PressEvent.\n' +
          'Taxonomy documentation: https://objectiv.io/docs/taxonomy/reference/location-contexts/ContentContext.',
        'color:red'
      );
    });
  });
});
