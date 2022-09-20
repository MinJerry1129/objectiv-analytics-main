/*
 * Copyright 2021-2022 Objectiv B.V.
 */

import {
  ConfigurableMockTransport,
  expectToThrow,
  LogTransport,
  MockConsoleImplementation,
} from '@objectiv/testing-tools';
import {
  ContextsConfig,
  generateGUID,
  makeTransportSendError,
  Tracker,
  TrackerEvent,
  TrackerTransportGroup,
  TrackerTransportRetry,
  TrackerTransportRetryAttempt,
  TrackerTransportSwitch,
} from '../src';

const testEventName = 'test-event';
const testContexts: ContextsConfig = {
  location_stack: [{ __instance_id: generateGUID(), __location_context: true, _type: 'section', id: 'test' }],
  global_contexts: [{ __instance_id: generateGUID(), __global_context: true, _type: 'global', id: 'test' }],
};
const testEvent = new TrackerEvent({ _type: testEventName, ...testContexts, id: generateGUID(), time: Date.now() });

require('@objectiv/developer-tools');
globalThis.objectiv.devTools?.TrackerConsole.setImplementation(MockConsoleImplementation);

describe('TrackerTransportSwitch', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not pick any TrackerTransport', () => {
    const transport1 = new ConfigurableMockTransport({ isUsable: false });
    const transport2 = new LogTransport();
    transport2.isUsable = () => false;

    expect(transport1.isUsable()).toBe(false);
    expect(transport2.isUsable()).toBe(false);

    jest.spyOn(transport1, 'handle');
    jest.spyOn(transport2, 'handle');

    const transports = new TrackerTransportSwitch({ transports: [transport1, transport2] });
    expect(transports.firstUsableTransport).toBe(undefined);
    expect(transports.isUsable()).toBe(false);

    expect(transports.handle(testEvent)).rejects.toEqual(
      'TrackerTransportSwitch: no usable Transport found; make sure to verify usability first.'
    );

    expect(transport1.handle).not.toHaveBeenCalled();
    expect(transport2.handle).not.toHaveBeenCalled();
  });

  it('should pick the second TrackerTransport', () => {
    const transport1 = new ConfigurableMockTransport({ isUsable: false });
    const transport2 = new LogTransport();

    expect(transport1.isUsable()).toBe(false);
    expect(transport2.isUsable()).toBe(true);

    jest.spyOn(transport1, 'handle');
    jest.spyOn(transport2, 'handle');

    const transports = new TrackerTransportSwitch({ transports: [transport1, transport2] });
    expect(transports.firstUsableTransport).toBe(transport2);
    expect(transports.isUsable()).toBe(true);

    const testTracker = new Tracker({ applicationId: 'app-id', transport: transports });

    testTracker.trackEvent(testEvent);

    expect(transport1.handle).not.toHaveBeenCalled();
    expect(transport2.handle).toHaveBeenCalledWith(expect.objectContaining({ _type: testEvent._type }));
  });
});

describe('TrackerTransportGroup', () => {
  it('should not handle any TrackerTransport', () => {
    const transport1 = new ConfigurableMockTransport({ isUsable: false });
    const transport2 = new LogTransport();
    transport2.isUsable = () => false;

    expect(transport1.isUsable()).toBe(false);
    expect(transport2.isUsable()).toBe(false);

    jest.spyOn(transport1, 'handle');
    jest.spyOn(transport2, 'handle');

    const transports = new TrackerTransportGroup({ transports: [transport1, transport2] });
    expect(transports.usableTransports).toStrictEqual([]);
    expect(transports.isUsable()).toBe(false);

    expect(transports.handle(testEvent)).rejects.toEqual(
      'TrackerTransportGroup: no usable Transports found; make sure to verify usability first.'
    );

    expect(transport1.handle).not.toHaveBeenCalled();
    expect(transport2.handle).not.toHaveBeenCalled();
  });

  it('should handle both TrackerTransport', () => {
    const transport1 = new LogTransport();
    const transport2 = new LogTransport();

    expect(transport1.isUsable()).toBe(true);
    expect(transport2.isUsable()).toBe(true);

    jest.spyOn(transport1, 'handle');
    jest.spyOn(transport2, 'handle');

    const transports = new TrackerTransportGroup({ transports: [transport1, transport2] });
    expect(transports.usableTransports).toStrictEqual([transport1, transport2]);
    expect(transports.isUsable()).toBe(true);

    const testTracker = new Tracker({ applicationId: 'app-id', transport: transports });

    testTracker.trackEvent(testEvent);

    expect(transport1.handle).toHaveBeenCalled();
    expect(transport2.handle).toHaveBeenCalled();
  });
});

describe('TrackerTransport complex configurations', () => {
  const fetch = new ConfigurableMockTransport({ isUsable: false });
  const xmlHTTPRequest = new ConfigurableMockTransport({ isUsable: false });
  const pigeon = new ConfigurableMockTransport({ isUsable: false });
  const consoleLog = new ConfigurableMockTransport({ isUsable: false });
  const errorLog = new ConfigurableMockTransport({ isUsable: false });

  beforeEach(() => {
    fetch._isUsable = false;
    xmlHTTPRequest._isUsable = false;
    pigeon._isUsable = false;
    consoleLog._isUsable = false;
    errorLog._isUsable = false;
    jest.clearAllMocks();
    jest.spyOn(fetch, 'handle');
    jest.spyOn(xmlHTTPRequest, 'handle');
    jest.spyOn(pigeon, 'handle');
    jest.spyOn(consoleLog, 'handle');
    jest.spyOn(errorLog, 'handle');
  });

  it('should handle to errorLog', () => {
    errorLog._isUsable = true;
    expect(errorLog.isUsable()).toBe(true);

    const sendTransport = new TrackerTransportSwitch({ transports: [fetch, xmlHTTPRequest, pigeon] });
    const sendAndLog = new TrackerTransportGroup({ transports: [sendTransport, consoleLog] });
    const transport = new TrackerTransportSwitch({ transports: [sendAndLog, errorLog] });

    expect(sendTransport.isUsable()).toBe(false);
    expect(sendAndLog.isUsable()).toBe(false);
    expect(transport.isUsable()).toBe(true);

    const testTracker = new Tracker({ applicationId: 'app-id', transport });

    testTracker.trackEvent(testEvent);

    expect(fetch.handle).not.toHaveBeenCalled();
    expect(xmlHTTPRequest.handle).not.toHaveBeenCalled();
    expect(pigeon.handle).not.toHaveBeenCalled();
    expect(consoleLog.handle).not.toHaveBeenCalled();
    expect(errorLog.handle).toHaveBeenCalled();
  });

  it('should handle to fetch and consoleLog', () => {
    fetch._isUsable = true;
    expect(fetch.isUsable()).toBe(true);
    consoleLog._isUsable = true;
    expect(consoleLog.isUsable()).toBe(true);

    const sendTransport = new TrackerTransportSwitch({ transports: [fetch, xmlHTTPRequest, pigeon] });
    const sendAndLog = new TrackerTransportGroup({ transports: [sendTransport, consoleLog] });
    const transport = new TrackerTransportSwitch({ transports: [sendAndLog, errorLog] });

    expect(sendTransport.isUsable()).toBe(true);
    expect(sendAndLog.isUsable()).toBe(true);
    expect(transport.isUsable()).toBe(true);

    const testTracker = new Tracker({ applicationId: 'app-id', transport });

    testTracker.trackEvent(testEvent);

    expect(fetch.handle).toHaveBeenCalled();
    expect(xmlHTTPRequest.handle).not.toHaveBeenCalled();
    expect(pigeon.handle).not.toHaveBeenCalled();
    expect(consoleLog.handle).toHaveBeenCalled();
    expect(errorLog.handle).not.toHaveBeenCalled();
  });

  it('should handle to consoleLog', () => {
    consoleLog._isUsable = true;
    expect(consoleLog.isUsable()).toBe(true);

    const sendTransport = new TrackerTransportSwitch({ transports: [fetch, xmlHTTPRequest, pigeon] });
    const sendAndLog = new TrackerTransportGroup({ transports: [sendTransport, consoleLog] });
    const transport = new TrackerTransportSwitch({ transports: [sendAndLog, errorLog] });

    expect(sendTransport.isUsable()).toBe(false);
    expect(sendAndLog.isUsable()).toBe(true);
    expect(transport.isUsable()).toBe(true);

    const testTracker = new Tracker({ applicationId: 'app-id', transport });

    testTracker.trackEvent(testEvent);

    expect(fetch.handle).not.toHaveBeenCalled();
    expect(xmlHTTPRequest.handle).not.toHaveBeenCalled();
    expect(pigeon.handle).not.toHaveBeenCalled();
    expect(consoleLog.handle).toHaveBeenCalled();
    expect(errorLog.handle).not.toHaveBeenCalled();
  });
});

describe('TrackerTransportRetry', () => {
  it('should generate exponential timeouts', () => {
    const retryTransport = new TrackerTransportRetry({ transport: new ConfigurableMockTransport({ isUsable: false }) });
    const retryTransportAttempt = new TrackerTransportRetryAttempt(retryTransport, [testEvent]);
    const timeouts = Array.from(Array(10).keys()).map(
      retryTransportAttempt.calculateNextTimeoutMs.bind(retryTransport)
    );
    expect(timeouts).toStrictEqual([1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000]);
  });

  it('should not accept 0 or negative minTimeoutMs', () => {
    expectToThrow(
      () =>
        new TrackerTransportRetry({ transport: new ConfigurableMockTransport({ isUsable: false }), minTimeoutMs: 0 }),
      'minTimeoutMs must be at least 1'
    );
    expectToThrow(
      () =>
        new TrackerTransportRetry({ transport: new ConfigurableMockTransport({ isUsable: false }), minTimeoutMs: -10 }),
      'minTimeoutMs must be at least 1'
    );
  });

  it('should not accept minTimeoutMs bigger than maxTimeoutMs', () => {
    expectToThrow(
      () =>
        new TrackerTransportRetry({
          transport: new ConfigurableMockTransport({ isUsable: false }),
          minTimeoutMs: 10,
          maxTimeoutMs: 5,
        }),
      'minTimeoutMs cannot be bigger than maxTimeoutMs'
    );
  });

  it('should do nothing if the given transport is not usable', () => {
    const unusableTransport = new ConfigurableMockTransport({ isUsable: false });
    jest.spyOn(unusableTransport, 'handle');

    const retryTransport = new TrackerTransportRetry({ transport: unusableTransport });

    expect(unusableTransport.isUsable()).toBe(false);
    expect(retryTransport.isUsable()).toBe(false);
    expect(unusableTransport.handle).not.toHaveBeenCalled();
  });

  it('should resolve as expected', async () => {
    const logTransport = new LogTransport();
    jest.spyOn(logTransport, 'handle');

    const retryTransport = new TrackerTransportRetry({ transport: logTransport });
    // @ts-ignore
    jest.spyOn(retryTransport.attempts, 'push');
    // @ts-ignore
    jest.spyOn(retryTransport.attempts, 'splice');

    await expect(retryTransport.handle(testEvent)).resolves.toBeUndefined();

    expect(retryTransport.attempts.push).toHaveBeenCalledTimes(1);
    expect(retryTransport.attempts.splice).toHaveBeenCalledTimes(1);
    expect(retryTransport.attempts).toHaveLength(0);
  });

  it('should not retry', async () => {
    const logTransport = new LogTransport();
    jest.spyOn(logTransport, 'handle').mockReturnValue(Promise.resolve());
    const retryTransport = new TrackerTransportRetry({ transport: logTransport });
    const retryTransportAttempt = new TrackerTransportRetryAttempt(retryTransport, [testEvent]);
    jest.spyOn(retryTransportAttempt, 'retry');

    await retryTransportAttempt.run();

    expect(retryTransportAttempt.retry).not.toHaveBeenCalled();
    expect(logTransport.handle).toHaveBeenCalledTimes(1);
  });

  it('should not retry on errors that are not TransportSendError', async () => {
    jest.useRealTimers();
    const mockedError = new Error('Some bug');
    const logTransport = new LogTransport();
    jest
      .spyOn(logTransport, 'handle')
      .mockReturnValueOnce(Promise.reject(mockedError))
      .mockReturnValueOnce(Promise.resolve());
    const retryTransport = new TrackerTransportRetry({
      transport: logTransport,
      minTimeoutMs: 1,
      maxTimeoutMs: 1,
      retryFactor: 1,
    });
    const retryTransportAttempt = new TrackerTransportRetryAttempt(retryTransport, [testEvent]);
    jest.spyOn(retryTransportAttempt, 'retry');

    await expect(retryTransportAttempt.run()).rejects.toEqual(mockedError);

    expect(retryTransportAttempt.attemptCount).toBe(1);
    expect(retryTransportAttempt.retry).not.toHaveBeenCalled();
    expect(logTransport.handle).toHaveBeenCalledTimes(1);
  });

  it('should retry once', async () => {
    jest.useRealTimers();
    const mockedError = makeTransportSendError();
    const logTransport = new LogTransport();
    jest
      .spyOn(logTransport, 'handle')
      .mockReturnValueOnce(Promise.reject(mockedError))
      .mockReturnValueOnce(Promise.resolve());
    const retryTransport = new TrackerTransportRetry({
      transport: logTransport,
      minTimeoutMs: 1,
      maxTimeoutMs: 1,
      retryFactor: 1,
    });
    const retryTransportAttempt = new TrackerTransportRetryAttempt(retryTransport, [testEvent]);
    jest.spyOn(retryTransportAttempt, 'retry');

    await retryTransportAttempt.run();

    expect(retryTransportAttempt.attemptCount).toBe(2);
    expect(retryTransportAttempt.retry).toHaveBeenCalledTimes(1);
    expect(retryTransportAttempt.retry).toHaveBeenNthCalledWith(1, mockedError);
    expect(logTransport.handle).toHaveBeenCalledTimes(2);
  });

  it('should retry three times', async () => {
    jest.useRealTimers();
    const mockedError = makeTransportSendError();
    const logTransport = new LogTransport();
    jest.spyOn(logTransport, 'handle').mockReturnValue(Promise.reject(mockedError));
    const retryTransport = new TrackerTransportRetry({
      transport: logTransport,
      maxAttempts: 3,
      minTimeoutMs: 1,
      maxTimeoutMs: 1,
      retryFactor: 1,
    });
    const retryTransportAttempt = new TrackerTransportRetryAttempt(retryTransport, [testEvent]);
    jest.spyOn(retryTransportAttempt, 'retry');

    await expect(retryTransportAttempt.run()).rejects.toEqual(
      expect.arrayContaining([new Error('maxAttempts reached')])
    );

    expect(retryTransportAttempt.attemptCount).toBe(4);
    expect(retryTransportAttempt.retry).toHaveBeenCalledTimes(3);
    expect(retryTransportAttempt.retry).toHaveBeenNthCalledWith(1, mockedError);
    expect(retryTransportAttempt.retry).toHaveBeenNthCalledWith(2, mockedError);
    expect(retryTransportAttempt.retry).toHaveBeenNthCalledWith(3, mockedError);
    expect(logTransport.handle).toHaveBeenCalledTimes(3);
    expect(retryTransportAttempt.errors[0]).toStrictEqual(new Error('maxAttempts reached'));
  });

  it('should stop retrying if we reached maxRetryMs', async () => {
    const logTransport = new LogTransport();
    const retryTransport = new TrackerTransportRetry({ transport: logTransport, maxRetryMs: 1 });
    const retryTransportAttempt = new TrackerTransportRetryAttempt(retryTransport, [testEvent]);

    // @ts-ignore Set the start time to yesterday
    retryTransportAttempt.startTime = Date.now() - 1000;

    await expect(retryTransportAttempt.run()).rejects.toEqual(
      expect.arrayContaining([new Error('maxRetryMs reached')])
    );

    expect(retryTransportAttempt.errors[0]).toStrictEqual(new Error('maxRetryMs reached'));
  });
});
