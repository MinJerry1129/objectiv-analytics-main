/*
 * Copyright 2021-2022 Objectiv B.V.
 */

import { useEffect, useRef } from 'react';
import { EffectDestructor } from '../types';

/**
 * A side effect that runs only once on unmount.
 */
export const useOnUnmount = (destructor: EffectDestructor) => {
  let latestDestructorRef = useRef<EffectDestructor>(destructor);

  latestDestructorRef.current = destructor;

  useEffect(() => () => latestDestructorRef.current && latestDestructorRef.current(), []);
};
