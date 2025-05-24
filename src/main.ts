/**
 * @file main.ts
 * @description This is the main entry point for the Angular application.
 * It bootstraps the root `AppComponent` using the application-specific
 * configurations defined in `appConfig`. This script initializes the Angular
 * framework and renders the main application component in the browser.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

/**
 * Bootstraps the Angular application.
 * @function bootstrapApplication
 * @param {Type<AppComponent>} AppComponent - The root component of the application.
 * @param {ApplicationConfig} appConfig - The application configuration object.
 * @returns {Promise<ApplicationRef>} A promise that resolves to an `ApplicationRef` instance once the application is bootstrapped.
 * @throws {Error} Logs an error to the console if the bootstrapping process fails.
 */
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
