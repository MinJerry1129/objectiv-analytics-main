/*
 * Copyright 2021-2022 Objectiv B.V.
 */

/**
 * Set package version in globals
 */
import pkg from '../package.json';
globalThis.objectiv = globalThis.objectiv ?? {};
globalThis.objectiv.versions = globalThis.objectiv.versions ?? new Map();
globalThis.objectiv.versions.set(pkg.name, pkg.version);

export * from '@objectiv/tracker-core';

export * from './common/factories/makeBrowserTrackerDefaultPluginsList';
export * from './common/factories/makeBrowserTrackerDefaultQueue';
export * from './common/factories/makeBrowserTrackerDefaultTransport';
export * from './common/guards/isFlushQueueOptions';
export * from './common/guards/isLocationContext';
export * from './common/guards/isLocationTaggerParameters';
export * from './common/guards/isParentTaggedElement';
export * from './common/guards/isPressableContext';
export * from './common/guards/isShowableContext';
export * from './common/guards/isTagChildrenElement';
export * from './common/guards/isTaggableElement';
export * from './common/guards/isTaggedElement';
export * from './common/guards/isTagLocationAttributes';
export * from './common/guards/isTagLocationOptions';
export * from './common/guards/isTagLocationParameters';
export * from './common/guards/isTrackBlursAttribute';
export * from './common/guards/isTrackClicksAttribute';
export * from './common/guards/isTrackVisibilityAttribute';
export * from './common/guards/isValidateAttribute';
export * from './common/guards/isValidChildrenTaggingQuery';
export * from './common/guards/isWaitUntilTrackedOptions';
export * from './common/parsers/parseJson';
export * from './common/parsers/parseLocationContext';
export * from './common/parsers/parseTagChildren';
export * from './common/parsers/parseTrackBlurs';
export * from './common/parsers/parseTrackClicks';
export * from './common/parsers/parseTrackVisibility';
export * from './common/parsers/parseValidate';
export * from './common/stringifiers/stringifyJson';
export * from './common/stringifiers/stringifyLocationContext';
export * from './common/stringifiers/stringifyTagChildren';
export * from './common/stringifiers/stringifyTrackBlurs';
export * from './common/stringifiers/stringifyTrackClicks';
export * from './common/stringifiers/stringifyTrackVisibility';
export * from './common/stringifiers/stringifyValidate';
export * from './common/findParentTaggedElements';
export * from './common/getElementLocationStack';
export * from './common/getLocationHref';
export * from './common/runIfValueIsNotUndefined';
export * from './common/trackerErrorHandler';

export * from './definitions/BrowserTrackerConfig';
export * from './definitions/ChildrenTaggingQueries';
export * from './definitions/ChildrenTaggingQuery';
export * from './definitions/FlushQueueOptions';
export * from './definitions/GuardableElement';
export * from './definitions/InteractiveEventTrackerParameters';
export * from './definitions/LocationContext';
export * from './definitions/LocationTaggerParameters';
export * from './definitions/NonInteractiveEventTrackerParameters';
export * from './definitions/ParentTaggedElement';
export * from './definitions/TagLocationAttributes';
export * from './definitions/TagChildrenAttributes';
export * from './definitions/TagChildrenElement';
export * from './definitions/TagChildrenReturnValue';
export * from './definitions/TaggableElement';
export * from './definitions/TaggedElement';
export * from './definitions/TaggingAttribute';
export * from './definitions/TagLinkParameters';
export * from './definitions/TagLocationOptions';
export * from './definitions/TagLocationParameters';
export * from './definitions/TagLocationReturnValue';
export * from './definitions/TrackBlursAttribute';
export * from './definitions/TrackBlursOptions';
export * from './definitions/TrackClicksAttribute';
export * from './definitions/TrackClicksOptions';
export * from './definitions/TrackedElement';
export * from './definitions/TrackerErrorHandlerCallback';
export * from './definitions/TrackFailureEventParameters';
export * from './definitions/TrackSuccessEventParameters';
export * from './definitions/TrackVisibilityAttribute';
export * from './definitions/TrackVisibilityOptions';
export * from './definitions/ValidateAttribute';
export * from './definitions/ValidChildrenTaggingQuery';
export * from './definitions/WaitForQueueOptions';
export * from './definitions/WaitUntilTrackedOptions';

export * from './eventTrackers/trackFailureEvent';
export * from './eventTrackers/trackApplicationLoadedEvent';
export * from './eventTrackers/trackPressEvent';
export * from './eventTrackers/trackSuccessEvent';
export * from './eventTrackers/trackEvent';
export * from './eventTrackers/trackInputChangeEvent';
export * from './eventTrackers/trackInteractiveEvent';
export * from './eventTrackers/trackHiddenEvent';
export * from './eventTrackers/trackVisibleEvent';
export * from './eventTrackers/trackMediaEvent';
export * from './eventTrackers/trackMediaLoadEvent';
export * from './eventTrackers/trackMediaPauseEvent';
export * from './eventTrackers/trackMediaStartEvent';
export * from './eventTrackers/trackMediaStopEvent';
export * from './eventTrackers/trackNonInteractiveEvent';
export * from './eventTrackers/trackVisibility';

export * from './locationTaggers/tagChild';
export * from './locationTaggers/tagChildren';
export * from './locationTaggers/tagContent';
export * from './locationTaggers/tagExpandable';
export * from './locationTaggers/tagInput';
export * from './locationTaggers/tagLink';
export * from './locationTaggers/tagLocation';
export * from './locationTaggers/tagMediaPlayer';
export * from './locationTaggers/tagNavigation';
export * from './locationTaggers/tagOverlay';
export * from './locationTaggers/tagPressable';
export * from './locationTaggers/tagRootLocation';

export * from './mutationObserver/AutoTrackingState';
export * from './mutationObserver/makeBlurEventHandler';
export * from './mutationObserver/makeClickEventHandler';
export * from './mutationObserver/makeMutationCallback';
export * from './mutationObserver/processTagChildrenElement';
export * from './mutationObserver/trackNewElement';
export * from './mutationObserver/trackNewElements';
export * from './mutationObserver/trackRemovedElement';
export * from './mutationObserver/trackRemovedElements';
export * from './mutationObserver/trackVisibilityHiddenEvent';
export * from './mutationObserver/trackVisibilityVisibleEvent';

export * from './BrowserTracker';
export * from './getOrMakeTracker';
export * from './getTracker';
export * from './getTrackerRepository';
export * from './makeTracker';
export * from './setDefaultTracker';
export * from './startAutoTracking';
export * from './stopAutoTracking';
