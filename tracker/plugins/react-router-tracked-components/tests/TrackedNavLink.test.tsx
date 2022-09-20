/*
 * Copyright 2021-2022 Objectiv B.V.
 */

import { MockConsoleImplementation, LogTransport } from '@objectiv/testing-tools';
import { LocationContextName, Tracker } from '@objectiv/tracker-core';
import {
  ObjectivProvider,
  TrackedDiv,
  TrackedRootLocationContext,
  TrackingContextProvider,
} from '@objectiv/tracker-react';
import { fireEvent, getByTestId, render, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { TrackedNavLink, TrackedNavLinkProps } from '../src/TrackedNavLink';

require('@objectiv/developer-tools');
globalThis.objectiv.devTools?.TrackerConsole.setImplementation(MockConsoleImplementation);

describe('TrackedNavLink', () => {
  const logTransport = new LogTransport();
  jest.spyOn(logTransport, 'handle');
  const tracker = new Tracker({ applicationId: 'app-id', transport: logTransport });

  const cases: [TrackedNavLinkProps, { id: string; href: string }][] = [
    [
      { to: '/', children: 'test' },
      { id: 'test', href: '/' },
    ],
    [
      { to: '/slug', children: 'test' },
      { id: 'test', href: '/slug' },
    ],
    [
      { to: '/', children: 'test', id: 'custom-id' },
      { id: 'custom-id', href: '/' },
    ],
    [
      { to: { pathname: '/slug' }, children: 'test' },
      { id: 'test', href: '/slug' },
    ],
    [
      { to: { pathname: '/' }, children: 'test' },
      { id: 'test', href: '/' },
    ],
    [
      { to: { search: '?p=val' }, children: 'test' },
      { id: 'test', href: '/?p=val' },
    ],
    [
      { to: { pathname: '/', search: '?p=val' }, children: 'test' },
      { id: 'test', href: '/?p=val' },
    ],
    [
      { to: { hash: '#/hash' }, children: 'test' },
      { id: 'test', href: '/#/hash' },
    ],
    [
      { to: { pathname: '/', hash: '#/hash' }, children: 'test' },
      { id: 'test', href: '/#/hash' },
    ],
    [
      { to: { search: '?p=val', hash: '#/hash' }, children: 'test' },
      { id: 'test', href: '/?p=val#/hash' },
    ],
    [
      { to: { search: '?p=val', hash: '#/hash' }, children: 'test' },
      { id: 'test', href: '/?p=val#/hash' },
    ],
    [
      { to: { pathname: '/', search: '?p=val', hash: '#/hash' }, children: 'test' },
      { id: 'test', href: '/?p=val#/hash' },
    ],
    [
      { to: '/', children: '🏡', objectiv: { id: 'emoji' } },
      { id: 'emoji', href: '/' },
    ],
  ];

  cases.forEach(([linkProps, expectedAttributes]) => {
    it(`props: ${JSON.stringify(linkProps)} > LinkContext: ${JSON.stringify(expectedAttributes)}`, () => {
      jest.resetAllMocks();

      const { container } = render(
        <BrowserRouter>
          <TrackingContextProvider tracker={tracker}>
            <TrackedNavLink {...linkProps} data-testid={'test'}>
              test
            </TrackedNavLink>
          </TrackingContextProvider>
        </BrowserRouter>
      );

      fireEvent.click(getByTestId(container, 'test'));

      expect(logTransport.handle).toHaveBeenCalledTimes(1);
      expect(logTransport.handle).toHaveBeenCalledWith(
        expect.objectContaining({
          _type: 'PressEvent',
          location_stack: [
            expect.objectContaining({
              _type: LocationContextName.LinkContext,
              ...expectedAttributes,
            }),
          ],
        })
      );
    });
  });

  it('should TrackerConsole.error if an id cannot be automatically generated', () => {
    render(
      <BrowserRouter>
        <ObjectivProvider tracker={tracker}>
          <TrackedRootLocationContext objectiv={{ Component: 'div', id: 'root' }}>
            <TrackedDiv id={'content'}>
              <TrackedNavLink to={'/'}>🏡</TrackedNavLink>
            </TrackedDiv>
          </TrackedRootLocationContext>
        </ObjectivProvider>
      </BrowserRouter>
    );

    expect(MockConsoleImplementation.error).toHaveBeenCalledTimes(1);
    expect(MockConsoleImplementation.error).toHaveBeenCalledWith(
      '｢objectiv｣ Could not generate a valid id for LinkContext @ RootLocation:root / Content:content. Please provide either the `title` or the `objectiv.id` property manually.'
    );
  });

  it('should allow forwarding refs', () => {
    const linkRef = React.createRef<HTMLAnchorElement>();

    render(
      <BrowserRouter>
        <ObjectivProvider tracker={tracker}>
          <TrackedNavLink to="/" ref={linkRef}>
            Press me!
          </TrackedNavLink>
        </ObjectivProvider>
      </BrowserRouter>
    );

    expect(linkRef.current).toMatchInlineSnapshot(`
      <a
        aria-current="page"
        class="active"
        href="/"
      >
        Press me!
      </a>
    `);
  });

  it('should execute the given onClick as well', async () => {
    const clickSpy = jest.fn();

    const { container } = render(
      <BrowserRouter>
        <ObjectivProvider tracker={tracker}>
          <TrackedNavLink data-testid={'test1'} to="/" onClick={clickSpy}>
            Press me!
          </TrackedNavLink>
          <TrackedNavLink data-testid={'test2'} to="/" onClick={clickSpy} reloadDocument={true}>
            Press me!
          </TrackedNavLink>
        </ObjectivProvider>
      </BrowserRouter>
    );

    fireEvent.click(getByTestId(container, 'test1'));
    fireEvent.click(getByTestId(container, 'test2'));

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(2));
  });

  it('should wait until tracked', async () => {
    jest.useFakeTimers();
    const clickSpy = jest.fn();
    const logTransport = new LogTransport();
    jest
      .spyOn(logTransport, 'handle')
      .mockImplementation(async () => new Promise((resolve) => setTimeout(resolve, 100)));
    const tracker = new Tracker({ applicationId: 'app-id', transport: logTransport });
    jest.spyOn(logTransport, 'handle');

    const { container } = render(
      <BrowserRouter>
        <ObjectivProvider tracker={tracker}>
          <TrackedNavLink data-testid={'test-1'} to="/some-url-1" reloadDocument={true} onClick={clickSpy}>
            Press me 1
          </TrackedNavLink>
          <TrackedNavLink
            data-testid={'test-2'}
            to="/some-url-2"
            onClick={clickSpy}
            objectiv={{ waitUntilTracked: true }}
          >
            Press me 2
          </TrackedNavLink>
        </ObjectivProvider>
      </BrowserRouter>
    );

    jest.resetAllMocks();

    fireEvent.click(getByTestId(container, 'test-1'));

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));

    expect(logTransport.handle).toHaveBeenCalledTimes(1);
    expect(logTransport.handle).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        _type: 'PressEvent',
        location_stack: expect.arrayContaining([
          expect.objectContaining({
            _type: LocationContextName.LinkContext,
            id: 'press-me-1',
            href: '/some-url-1',
          }),
        ]),
      })
    );

    jest.resetAllMocks();

    fireEvent.click(getByTestId(container, 'test-2'));

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));

    expect(logTransport.handle).toHaveBeenCalledTimes(1);
    expect(logTransport.handle).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        _type: 'PressEvent',
        location_stack: expect.arrayContaining([
          expect.objectContaining({
            _type: LocationContextName.LinkContext,
            id: 'press-me-2',
            href: '/some-url-2',
          }),
        ]),
      })
    );
  });
});
