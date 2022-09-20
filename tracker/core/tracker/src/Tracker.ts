/*
 * Copyright 2021-2022 Objectiv B.V.
 */

import { AbstractGlobalContext, AbstractLocationContext, Contexts } from '@objectiv/schema';
import { ContextsConfig } from './Context';
import { generateGUID, waitForPromise } from './helpers';
import { TrackerEvent, TrackerEventAttributes } from './TrackerEvent';
import { TrackerPlatform } from './TrackerPlatform';
import { TrackerPluginInterface } from './TrackerPluginInterface';
import { TrackerPlugins } from './TrackerPlugins';
import { TrackerQueueInterface } from './TrackerQueueInterface';
import { TrackerTransportGroup } from './TrackerTransportGroup';
import { TrackerTransportInterface } from './TrackerTransportInterface';

/**
 * The configuration of the Tracker
 */
export type TrackerConfig = ContextsConfig & {
  /**
   * Application ID. Used to generate ApplicationContext (global context).
   */
  applicationId: string;

  /**
   * Optional. Function to generate unique identifiers used by the Tracker to set the `id` of TrackerEvents.
   *
   * Format
   *  The current format we use for these identifiers is Universally Unique Identifier version 4 (UUID v4).
   *
   * Default implementation
   *  The default implementation uses `v4` from the `uuid` js module. See: https://github.com/uuidjs/uuid.
   *
   * Why are unique identifiers so important?
   *  TrackerEvents must have globally unique identifiers, at the very least in the same session, for deduplication.
   *
   *  This is because Trackers may send the same events multiple times to the Collector in several situations:
   *
   *   - Tracker gets destroyed before receiving a response from the Collector.
   *   - Tracker gets destroyed before having the time to clean the persistent Queue.
   *   - Flaky connectivity may lead to timeouts and remote responses being lost, which results in retries.
   *
   *  In general, Trackers will always re-send events when it's not 100% certain whether they were delivered or not.
   *
   *  Unique identifiers are also essential across devices/platforms. E.g. web vs mobile, to ensure data may be
   *  correlated across them without collisions.
   *
   * What if the target platform doesn't have a GUID/UUID generator?
   *  On platforms that don't have a native method to generate a UUID/GUID but have native random generators, such as
   *  React Native, a polyfill may be used to gain access to the native random generators. These implementations
   *  usually expose the underlying system's SecureRandom (Android) or SecRandomCopyBytes (iOS).
   *  For example https://github.com/LinusU/react-native-get-random-values.
   *
   * What if the platform has no secure generator?
   *  Worst case scenario, the uuidv4 module included in Core Tracker can be used. It comes with a generator that uses
   *  Date.now() & Math.random as rng source. While not ideal, it's also not that bad: https://v8.dev/blog/math-random
   */
  generateGUID?: () => string;

  /**
   * Optional. The platform of the Tracker Instance. This affects error logging. Defaults to Core.
   */
  platform?: TrackerPlatform;

  /**
   * Optional. Unique identifier for the TrackerInstance. Defaults to the same value of `applicationId`.
   */
  trackerId?: string;

  /**
   * Optional. TrackerQueue instance. Responsible for queueing and batching Events. Queuing occurs before Transport.
   */
  queue?: TrackerQueueInterface;

  /**
   * Optional. TrackerTransport instance. Responsible for sending or storing Events. Transport occurs after Queueing.
   */
  transport?: TrackerTransportInterface;

  /**
   * Optional. Additional Plugins to add to the default list of Plugins of the tracker.
   */
  plugins?: TrackerPlugins | TrackerPluginInterface[];

  /**
   * Optional. Determines if the TrackerInstance.trackEvent will process Events or not.
   */
  active?: boolean;
};

/**
 * The default list of Plugins of Core Tracker
 */
export const makeCoreTrackerDefaultPluginsList = () => {
  const plugins: TrackerPluginInterface[] = [];

  if (globalThis.objectiv.devTools) {
    plugins.push(globalThis.objectiv.devTools.OpenTaxonomyValidationPlugin);
  }

  return plugins;
};

/**
 * A type guard to determine if trackerConfig plugins is an array of plugins
 */
export const isPluginsArray = (
  plugins?: TrackerPlugins | TrackerPluginInterface[]
): plugins is TrackerPluginInterface[] => {
  return Array.isArray(plugins);
};

/**
 * The parameters object of Tracker.waitForQueue(parameters?: WaitForQueueParameters).
 */
export type WaitForQueueParameters = {
  intervalMs?: number;
  timeoutMs?: number;
};

/**
 * The `options` parameter of Tracker.trackEvent(event: TrackerEventConfig, options?: TrackEventOptions).
 */
export type TrackEventOptions = {
  waitForQueue?: true | WaitForQueueParameters;
  flushQueue?: true | 'onTimeout';
};

/**
 * TrackerInterface implements Contexts and TrackerConfig, with the exception that plugins are not just an array of
 * Plugin instances, but they are wrapped in a TrackerPlugins instance.
 * It also enforces a platform to be specified by all implementations.
 */
export type TrackerInterface = Contexts &
  Omit<TrackerConfig, 'plugins'> & {
    plugins: TrackerPlugins;
    platform: TrackerPlatform;
  };

/**
 * Our basic platform-agnostic JavaScript Tracker interface and implementation
 */
export class Tracker implements TrackerInterface {
  readonly platform: TrackerPlatform;
  readonly applicationId: string;
  readonly trackerId: string;
  readonly queue?: TrackerQueueInterface;
  readonly transport?: TrackerTransportInterface;
  readonly plugins: TrackerPlugins;
  readonly generateGUID: () => string;

  // Trackers are automatically activated, unless differently specified via config, during construction.
  active: boolean = false;

  // Contexts interface
  readonly location_stack: AbstractLocationContext[];
  readonly global_contexts: AbstractGlobalContext[];

  /**
   * Configures the Tracker instance via one TrackerConfig and optionally one or more ContextConfig.
   *
   * TrackerConfig is used to configure TrackerTransport and TrackerPlugins.
   *
   * ContextConfigs are used to configure location_stack and global_contexts. If multiple configurations have been
   * provided they will be merged onto each other to produce a single location_stack and global_contexts.
   */
  constructor(trackerConfig: TrackerConfig, ...contextConfigs: ContextsConfig[]) {
    this.platform = trackerConfig.platform ?? TrackerPlatform.CORE;
    this.applicationId = trackerConfig.applicationId;
    this.trackerId = trackerConfig.trackerId ?? trackerConfig.applicationId;
    this.queue = trackerConfig.queue;
    this.transport = trackerConfig.transport;
    this.generateGUID = trackerConfig.generateGUID ?? generateGUID;

    // Process ContextConfigs
    let new_location_stack: AbstractLocationContext[] = trackerConfig.location_stack ?? [];
    let new_global_contexts: AbstractGlobalContext[] = trackerConfig.global_contexts ?? [];
    contextConfigs.forEach(({ location_stack, global_contexts }) => {
      new_location_stack = [...new_location_stack, ...(location_stack ?? [])];
      new_global_contexts = [...new_global_contexts, ...(global_contexts ?? [])];
    });
    this.location_stack = new_location_stack;
    this.global_contexts = new_global_contexts;

    // Process plugins
    if (isPluginsArray(trackerConfig.plugins) || trackerConfig.plugins === undefined) {
      this.plugins = new TrackerPlugins({
        tracker: this,
        plugins: [...makeCoreTrackerDefaultPluginsList(), ...(trackerConfig.plugins ?? [])],
      });
    } else {
      this.plugins = trackerConfig.plugins;
    }

    // Inject EventRecorder as Transport, if available. Either group it with the existing transport or set it.
    if (globalThis.objectiv.devTools?.EventRecorder.enabled) {
      this.transport = !this.transport
        ? globalThis.objectiv.devTools.EventRecorder
        : new TrackerTransportGroup({
            transports: [globalThis.objectiv.devTools.EventRecorder, this.transport],
          });
    }

    // Change tracker state. If active it will initialize Plugins and start the Queue runner.
    this.setActive(trackerConfig.active ?? true);

    // Add Tracker to the TrackerRepository
    globalThis.objectiv.TrackerRepository.add(this);

    if (globalThis.objectiv.devTools) {
      globalThis.objectiv.devTools.TrackerConsole.groupCollapsed(
        `｢objectiv:Tracker:${this.trackerId}｣ Initialized (${globalThis.objectiv.devTools.getLocationPath(
          this.location_stack
        )})`
      );
      globalThis.objectiv.devTools.TrackerConsole.log(`Active: ${this.active}`);
      globalThis.objectiv.devTools.TrackerConsole.log(`Application ID: ${this.applicationId}`);
      globalThis.objectiv.devTools.TrackerConsole.log(`Queue: ${this.queue?.queueName ?? 'none'}`);
      globalThis.objectiv.devTools.TrackerConsole.log(`Transport: ${this.transport?.transportName ?? 'none'}`);
      globalThis.objectiv.devTools.TrackerConsole.group(`Plugins:`);
      globalThis.objectiv.devTools.TrackerConsole.log(
        this.plugins.plugins.map((plugin) => plugin.pluginName).join(', ')
      );
      globalThis.objectiv.devTools.TrackerConsole.groupEnd();
      globalThis.objectiv.devTools.TrackerConsole.group(`Location Stack:`);
      globalThis.objectiv.devTools.TrackerConsole.log(this.location_stack);
      globalThis.objectiv.devTools.TrackerConsole.groupEnd();
      globalThis.objectiv.devTools.TrackerConsole.group(`Global Contexts:`);
      globalThis.objectiv.devTools.TrackerConsole.log(this.global_contexts);
      globalThis.objectiv.devTools.TrackerConsole.groupEnd();
      globalThis.objectiv.devTools.TrackerConsole.groupEnd();
    }
  }

  /**
   * Setter for the Tracker Instance `active` state, initializes Plugins and starts the Queue runner
   */
  setActive(newActiveState: boolean) {
    if (newActiveState !== this.active) {
      this.active = newActiveState;

      if (this.active) {
        // Execute all plugins `initialize` callback. Plugins may use this to register automatic event listeners
        this.plugins.initialize(this);

        // If we have a Queue and a usable Transport, start Queue runner
        if (this.queue && this.transport && this.transport.isUsable()) {
          // Bind the handle function to its Transport instance to preserve its scope
          const processFunction = this.transport.handle.bind(this.transport);

          // Set the queue processFunction to transport.handle method: the queue will run Transport.handle for each batch
          this.queue.setProcessFunction(processFunction);

          globalThis.objectiv.devTools?.TrackerConsole.log(
            `%c｢objectiv:Tracker:${this.trackerId}｣ ${this.queue.queueName} is ready to run ${this.transport.transportName}`,
            'font-weight:bold'
          );
        }
      }

      globalThis.objectiv.devTools?.TrackerConsole.log(
        `%c｢objectiv:Tracker:${this.trackerId}｣ New state: ${this.active ? 'active' : 'inactive'}`,
        'font-weight: bold'
      );
    }
  }

  /**
   * Flushes the Queue
   */
  flushQueue() {
    if (this.queue) {
      this.queue.flush();
    }
  }

  /**
   * Waits for Queue `isIdle` in an attempt to wait for it to finish its job.
   * Resolves regardless if the Queue reaches an idle state or timeout is reached.
   */
  async waitForQueue(parameters?: WaitForQueueParameters): Promise<boolean> {
    if (this.queue) {
      // Some - hopefully - sensible defaults. 100ms for polling and double the Queue's batch delay as timeout.
      const intervalMs = parameters?.intervalMs ?? 100;
      const timeoutMs = parameters?.timeoutMs ?? this.queue.batchDelayMs * 2;

      // Bind the isHandle function to its Queue instance to preserve its scope
      const predicate = this.queue.isIdle.bind(this.queue);

      return waitForPromise({ predicate, intervalMs, timeoutMs });
    }
    return true;
  }

  /**
   * Merges Tracker Location and Global contexts, runs all Plugins and sends the Event via the TrackerTransport.
   */
  async trackEvent(event: TrackerEventAttributes, options?: TrackEventOptions): Promise<TrackerEvent> {
    // TrackerEvent and Tracker share the ContextsConfig interface. Combine them and Set id and time.
    const trackerEvent = new TrackerEvent({ ...event, id: this.generateGUID(), time: Date.now() }, this);

    // Do nothing if the TrackerInstance is inactive
    if (!this.active) {
      return trackerEvent;
    }

    // Execute all plugins `enrich` callback. Plugins may enrich or add Contexts to the TrackerEvent
    this.plugins.enrich(trackerEvent);

    // Execute all plugins `validate` callback. In dev mode this will log to the console any issues.
    this.plugins.validate(trackerEvent);

    // Hand over TrackerEvent to TrackerTransport or TrackerQueue, if enabled and usable.
    if (this.transport && this.transport.isUsable()) {
      if (globalThis.objectiv.devTools) {
        globalThis.objectiv.devTools.TrackerConsole.groupCollapsed(
          `｢objectiv:Tracker:${this.trackerId}｣ ${this.queue ? 'Queuing' : 'Tracking'} ${
            trackerEvent._type
          } (${globalThis.objectiv.devTools.getLocationPath(trackerEvent.location_stack)})`
        );
        globalThis.objectiv.devTools.TrackerConsole.log(`Event ID: ${trackerEvent.id}`);
        globalThis.objectiv.devTools.TrackerConsole.log(`Time: ${trackerEvent.time}`);
        globalThis.objectiv.devTools.TrackerConsole.group(`Location Stack:`);
        globalThis.objectiv.devTools.TrackerConsole.log(trackerEvent.location_stack);
        globalThis.objectiv.devTools.TrackerConsole.groupEnd();
        globalThis.objectiv.devTools.TrackerConsole.group(`Global Contexts:`);
        globalThis.objectiv.devTools.TrackerConsole.log(trackerEvent.global_contexts);
        globalThis.objectiv.devTools.TrackerConsole.groupEnd();
        globalThis.objectiv.devTools.TrackerConsole.groupEnd();
      }

      if (this.queue) {
        await this.queue.push(trackerEvent);
      } else {
        await this.transport.handle(trackerEvent);
      }
    }

    // Check whether we need to wait for the Tracker to wait for its Queue and/or whether we should flush it afterwards
    if (options) {
      const { waitForQueue, flushQueue } = options;

      let isQueueEmpty = true;
      if (waitForQueue) {
        // Attempt to wait for the Tracker to finish up its work - this is best-effort: may or may not time out
        isQueueEmpty = await this.waitForQueue(waitForQueue === true ? {} : waitForQueue);
      }

      // Flush the Queue - unless specifically configured not to do so
      if (flushQueue === true || (flushQueue === 'onTimeout' && !isQueueEmpty)) {
        this.flushQueue();
      }
    }

    return trackerEvent;
  }
}
