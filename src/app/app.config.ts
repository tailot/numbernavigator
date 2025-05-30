/**
 * @file app.config.ts
 * @description This file contains the application configuration for the Angular application.
 * It sets up the necessary providers and configurations for the application to run.
 */
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';

/**
 * @constant appConfig
 * @type {ApplicationConfig}
 * @description The main application configuration object.
 * This object is used to configure the Angular application, including providers for routing and zoneless change detection.
 *
 * @property {Array<any>} providers - An array of providers for the application.
 *    - `provideRouter(routes)`: Configures the application routes.
 *    - `provideZonelessChangeDetection()`: Configures zoneless change detection.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection()
    // provideExperimentalCheckNoChangesForDebug has been removed as it is no longer exported by @angular/core.
  ]
};
