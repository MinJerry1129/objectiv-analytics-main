/*
 * Copyright 2021-2022 Objectiv B.V.
 */

import {
  GlobalContextName,
  makeHttpContext,
  TrackerEvent,
  TrackerInterface,
  TrackerPluginInterface,
  TrackerValidationRuleInterface,
} from '@objectiv/tracker-core';

/**
 * The HttpContext Plugin gathers the current URL using the Location API.
 * It implements the `initialize` lifecycle method. This ensures the Context is generated when the tracker is created.
 */
export class HttpContextPlugin implements TrackerPluginInterface {
  readonly pluginName = `HttpContextPlugin`;
  validationRules: TrackerValidationRuleInterface[] = [];
  initialized: boolean = false;

  /**
   * Generates an HttpContext and initializes validation rules.
   */
  initialize({ global_contexts, platform }: TrackerInterface): void {
    if (!this.isUsable()) {
      globalThis.objectiv.devTools?.TrackerConsole.error(
        `｢objectiv:${
          this.pluginName
        }｣ Cannot initialize. Plugin is not usable (document: ${typeof document}, navigator: ${typeof navigator}).`
      );
      return;
    }

    if (globalThis.objectiv.devTools) {
      this.validationRules = [
        globalThis.objectiv.devTools.makeMissingGlobalContextValidationRule({
          platform,
          logPrefix: this.pluginName,
          contextName: GlobalContextName.HttpContext,
        }),
      ];
    }

    const httpContext = makeHttpContext({
      id: 'http_context',
      referrer: document.referrer ?? '',
      user_agent: navigator.userAgent ?? '',
    });

    global_contexts.push(httpContext);

    this.initialized = true;

    globalThis.objectiv.devTools?.TrackerConsole.log(
      `%c｢objectiv:${this.pluginName}｣ Initialized`,
      'font-weight: bold'
    );
  }

  /**
   * If the Plugin is usable runs all validation rules.
   */
  validate(event: TrackerEvent): void {
    if (!this.isUsable()) {
      globalThis.objectiv.devTools?.TrackerConsole.error(
        `｢objectiv:${
          this.pluginName
        }｣ Cannot validate. Plugin is not usable (document: ${typeof document}, navigator: ${typeof navigator}).`
      );
      return;
    }

    if (!this.initialized) {
      globalThis.objectiv.devTools?.TrackerConsole.error(
        `｢objectiv:${this.pluginName}｣ Cannot validate. Make sure to initialize the plugin first.`
      );
      return;
    }

    this.validationRules.forEach((validationRule) => validationRule.validate(event));
  }

  /**
   * Make this plugin usable only on web, eg: Document and Navigation APIs are both available
   */
  isUsable(): boolean {
    return typeof document !== 'undefined' && typeof navigator !== 'undefined';
  }
}
