/*
 * Copyright 2021-2022 Objectiv B.V.
 */

import { makeTransportSendError, TrackerEvent } from '@objectiv/tracker-core';

/**
 * The default XMLHttpRequest function implementation.
 */
export const defaultXHRFunction = ({
  endpoint,
  events,
}: {
  endpoint: string;
  events: [TrackerEvent, ...TrackerEvent[]];
}): Promise<unknown> => {
  return new Promise(function (resolve, reject) {
    if (globalThis.objectiv.devTools) {
      globalThis.objectiv.devTools.TrackerConsole.groupCollapsed(`｢objectiv:XHRTransport｣ Sending`);
      globalThis.objectiv.devTools.TrackerConsole.log(`Events:`);
      globalThis.objectiv.devTools.TrackerConsole.log(events);
      globalThis.objectiv.devTools.TrackerConsole.groupEnd();
    }

    const xhr = new XMLHttpRequest();
    const async = true;
    xhr.open('POST', endpoint, async);
    xhr.setRequestHeader('Content-Type', 'text/plain');
    xhr.withCredentials = true;
    xhr.onload = () => {
      if (xhr.status === 200) {
        if (globalThis.objectiv.devTools) {
          globalThis.objectiv.devTools.TrackerConsole.groupCollapsed(`｢objectiv:XHRTransport｣ Succeeded`);
          globalThis.objectiv.devTools.TrackerConsole.log(`Events:`);
          globalThis.objectiv.devTools.TrackerConsole.log(events);
          globalThis.objectiv.devTools.TrackerConsole.groupEnd();
        }

        resolve(xhr.response);
      } else {
        if (globalThis.objectiv.devTools) {
          globalThis.objectiv.devTools.TrackerConsole.groupCollapsed(`%c｢objectiv:XHRTransport｣ Failed`, 'color:red');
          globalThis.objectiv.devTools.TrackerConsole.log(`Events:`);
          globalThis.objectiv.devTools.TrackerConsole.log(events);
          globalThis.objectiv.devTools.TrackerConsole.log(`Response: ${xhr}`);
          globalThis.objectiv.devTools.TrackerConsole.groupEnd();
        }

        reject(makeTransportSendError());
      }
    };
    xhr.onerror = () => {
      if (globalThis.objectiv.devTools) {
        globalThis.objectiv.devTools.TrackerConsole.groupCollapsed(`%c｢objectiv:XHRTransport｣ Error`, 'color:red');
        globalThis.objectiv.devTools.TrackerConsole.log(`Events:`);
        globalThis.objectiv.devTools.TrackerConsole.log(events);
        globalThis.objectiv.devTools.TrackerConsole.groupEnd();
      }

      reject(makeTransportSendError());
    };
    xhr.send(
      JSON.stringify({
        events,

        // Add client session id to the request
        client_session_id: globalThis.objectiv.clientSessionId,

        // add current timestamp to the request, so the collector
        // may check if there's any clock offset between server and client
        transport_time: Date.now(),
      })
    );
  });
};
