/**
 * @file app.config.ts
 * @description This file contains the application configuration for the Angular application.
 * It sets up the necessary providers and configurations for the application to run.
 */
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

/**
 * @constant appConfig
 * @type {ApplicationConfig}
 * @description The main application configuration object.
 * This object is used to configure the Angular application, including providers for routing and change detection.
 *
 * @property {Array<any>} providers - An array of providers for the application.
 *    - `provideZoneChangeDetection({ eventCoalescing: true })`: Configures Zone.js change detection with event coalescing.
 */
export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true })]
};
