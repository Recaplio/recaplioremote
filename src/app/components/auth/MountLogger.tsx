'use client';

import { useEffect } from 'react';

let mountCount = 0;

export default function MountLogger({ name }: { name: string }) {
  const instance = ++mountCount;
  console.log(`%c[MountLogger:${name}] INSTANCE ${instance} CREATED/RENDERED`, 'color: purple; font-weight: bold;');

  useEffect(() => {
    console.log(`%c[MountLogger:${name}] INSTANCE ${instance} MOUNTED (useEffect [])`, 'color: purple; font-weight: bold;');
    return () => {
      console.log(`%c[MountLogger:${name}] INSTANCE ${instance} UNMOUNTING (useEffect [] cleanup)`, 'color: purple; font-weight: bold;');
    };
  }, [name, instance]); // Added name and instance to dependency array

  return null; // This component doesn't render anything visible
} 