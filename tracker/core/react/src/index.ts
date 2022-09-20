/*
 * Copyright 2022 Objectiv B.V.
 */

/**
 * Set package version in globals
 */
import pkg from '../package.json';
globalThis.objectiv = globalThis.objectiv ?? {};
globalThis.objectiv.versions = globalThis.objectiv.versions ?? new Map();
globalThis.objectiv.versions.set(pkg.name, pkg.version);

export * from './common/factories/makeTitleFromChildren';
export * from './common/factories/recursiveGetTextFromChildren';

export * from './common/providers/LocationProvider';
export * from './common/providers/LocationProviderContext';
export * from './common/providers/ObjectivProvider';
export * from './common/providers/ObjectivProviderContext';
export * from './common/providers/TrackerProvider';
export * from './common/providers/TrackerProviderContext';
export * from './common/providers/TrackingContext';
export * from './common/providers/TrackingContextProvider';

export * from './eventTrackers/trackApplicationLoadedEvent';
export * from './eventTrackers/trackFailureEvent';
export * from './eventTrackers/trackHiddenEvent';
export * from './eventTrackers/trackInputChangeEvent';
export * from './eventTrackers/trackInteractiveEvent';
export * from './eventTrackers/trackMediaEvent';
export * from './eventTrackers/trackMediaLoadEvent';
export * from './eventTrackers/trackMediaPauseEvent';
export * from './eventTrackers/trackMediaStartEvent';
export * from './eventTrackers/trackMediaStopEvent';
export * from './eventTrackers/trackNonInteractiveEvent';
export * from './eventTrackers/trackPressEvent';
export * from './eventTrackers/trackSuccessEvent';
export * from './eventTrackers/trackVisibility';
export * from './eventTrackers/trackVisibleEvent';

export * from './hooks/consumers/useLocationStack';
export * from './hooks/consumers/useParentLocationContext';
export * from './hooks/consumers/useTracker';
export * from './hooks/consumers/useTrackingContext';

export * from './hooks/eventTrackers/mergeEventTrackerHookAndCallbackParameters';
export * from './hooks/eventTrackers/useApplicationLoadedEventTracker';
export * from './hooks/eventTrackers/useFailureEventTracker';
export * from './hooks/eventTrackers/useHiddenEventTracker';
export * from './hooks/eventTrackers/useInputChangeEventTracker';
export * from './hooks/eventTrackers/useInteractiveEventTracker';
export * from './hooks/eventTrackers/useMediaEventTracker';
export * from './hooks/eventTrackers/useMediaLoadEventTracker';
export * from './hooks/eventTrackers/useMediaPauseEventTracker';
export * from './hooks/eventTrackers/useMediaStartEventTracker';
export * from './hooks/eventTrackers/useMediaStopEventTracker';
export * from './hooks/eventTrackers/useNonInteractiveEventTracker';
export * from './hooks/eventTrackers/usePressEventTracker';
export * from './hooks/eventTrackers/useSuccessEventTracker';
export * from './hooks/eventTrackers/useVisibleEventTracker';
export * from './hooks/eventTrackers/useVisibilityTracker';

export * from './hooks/useOnContextChange';
export * from './hooks/useOnMount';
export * from './hooks/useOnMountOnce';
export * from './hooks/useOnToggle';
export * from './hooks/useOnUnmount';
export * from './hooks/useOnUnmountOnce';
export * from './hooks/useTrackOnMount';
export * from './hooks/useTrackOnMountOnce';
export * from './hooks/useTrackOnToggle';
export * from './hooks/useTrackOnUnmount';
export * from './hooks/useTrackOnUnmountOnce';

export * from './locationWrappers/ContentContextWrapper';
export * from './locationWrappers/ExpandableContextWrapper';
export * from './locationWrappers/InputContextWrapper';
export * from './locationWrappers/LinkContextWrapper';
export * from './locationWrappers/LocationContextWrapper';
export * from './locationWrappers/MediaPlayerContextWrapper';
export * from './locationWrappers/NavigationContextWrapper';
export * from './locationWrappers/OverlayContextWrapper';
export * from './locationWrappers/PressableContextWrapper';
export * from './locationWrappers/RootLocationContextWrapper';

export * from './types';
